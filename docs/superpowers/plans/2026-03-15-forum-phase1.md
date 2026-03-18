# Forum Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover feed sorting, nested replies, notifications, and link preview in the monolith forum, and migrate all data from the standalone forum's Docker PostgreSQL into Supabase.

**Architecture:** All features extend the existing `Forum*` Prisma model family with additive schema changes. The migration script connects simultaneously to the standalone Docker DB and the monolith Supabase DB, mapping models and users. Features are wired through existing server action patterns (fire-and-forget side-effects, `revalidatePath`, `redirect` outside try/catch).

**Tech Stack:** Next.js 15 App Router, Prisma v7 + PrismaPg adapter, Supabase PostgreSQL, Tailwind CSS v4, server actions, `zod`, `bcryptjs`, `pg` Pool

**Spec:** `docs/superpowers/specs/2026-03-15-forum-phase1-design.md`

---

## Chunk 1: Foundation — Schema + DB Push

### Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `parentId`, `depth`, `linkPreviewUrl`, self-relation, and `notifications` back-relation to `ForumPost`**

Find the `ForumPost` model and add these fields (insert after the `deletedAt` field, before the relations):

```prisma
  parentId       String?
  depth          Int           @default(0)
  linkPreviewUrl String?
```

Add these relations (after the existing `votes` and `reports` relations):

```prisma
  parent         ForumPost?    @relation("PostReplies", fields: [parentId], references: [id])
  replies        ForumPost[]   @relation("PostReplies")
  notifications  ForumNotification[]
```

Add to the `@@index` list:

```prisma
  @@index([parentId])
```

- [ ] **Step 2: Add `voteScore`, `linkPreviewUrl`, and `notifications` back-relation to `ForumThread`**

Find the `ForumThread` model and add these fields after `hotScore`:

```prisma
  voteScore      Int           @default(0)
  linkPreviewUrl String?
```

Add this relation after the existing `reports` relation:

```prisma
  notifications  ForumNotification[]
```

- [ ] **Step 3: Add `ForumNotificationType` enum**

Add this enum near the other forum enums in the schema:

```prisma
enum ForumNotificationType {
  REPLY_TO_THREAD
  REPLY_TO_POST
  MENTION
  VOTE_MILESTONE
}
```

- [ ] **Step 4: Add `ForumNotification` model**

Add this model after `ForumReport`:

```prisma
model ForumNotification {
  id        String                @id @default(cuid())
  userId    String
  actorId   String?
  type      ForumNotificationType
  threadId  String?
  postId    String?
  meta      Json?
  read      Boolean               @default(false)
  createdAt DateTime              @default(now())

  user      User          @relation("ForumNotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  actor     User?         @relation("ForumNotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  thread    ForumThread?  @relation(fields: [threadId], references: [id], onDelete: Cascade)
  post      ForumPost?    @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@index([userId, createdAt])
  @@index([actorId, type, postId])
  @@map("forum_notifications")
}
```

- [ ] **Step 5: Add `ForumLinkPreview` model**

Add this model after `ForumNotification`:

```prisma
model ForumLinkPreview {
  url         String   @id
  title       String?
  description String?
  imageUrl    String?
  fetchedAt   DateTime @default(now())

  @@map("forum_link_previews")
}
```

- [ ] **Step 6: Add back-relations to `User` model**

Find the `User` model and add these two lines in the relations section (alongside other forum relations):

```prisma
  forumNotificationsReceived ForumNotification[] @relation("ForumNotificationRecipient")
  forumNotificationsGiven    ForumNotification[] @relation("ForumNotificationActor")
```

---

### Task 2: Push Schema + Regenerate Client

**Files:**
- None (DB + generated client only)

- [ ] **Step 1: Push schema changes to Supabase**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

If there's a conflict error on `ForumNotification` relations to `User`, check that both `forumNotificationsReceived` and `forumNotificationsGiven` are added and the relation names match exactly.

- [ ] **Step 2: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` with no type errors.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If errors appear, they will be in files that reference `ForumPost` or `ForumThread` — fix by adding `notifications?: ...` to any TypeScript interfaces that mirror the Prisma types.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(forum): schema additions — nested replies, voteScore, notifications, link preview"
```

---

## Chunk 2: Feed Sorting

### Task 3: Update `voteOnPost` to Maintain Denormalized `voteScore`

**Files:**
- Modify: `src/modules/forum/lib/queries.ts` (around line 318-343, the fire-and-forget hotScore block)

- [ ] **Step 1: Find the fire-and-forget hotScore update block in `voteOnPost`**

It looks like this (around line 318):

```ts
// Fire-and-forget hotScore update
void (async () => {
  try {
    const thread = await db.forumThread.findFirst({ ... })
    if (thread) {
      // ... calculates newVoteScore and newHotScore
      await db.forumThread.update({
        where: { id: thread.id },
        data: { hotScore: newHotScore },
      })
    }
  } catch {}
})()
```

- [ ] **Step 2: Update the `db.forumThread.update` call to also write `voteScore`**

Change:
```ts
      await db.forumThread.update({
        where: { id: thread.id },
        data: { hotScore: newHotScore },
      })
```

To:
```ts
      await db.forumThread.update({
        where: { id: thread.id },
        data: { hotScore: newHotScore, voteScore: newVoteScore },
      })
```

`newVoteScore` is already computed just above this line — no new calculation needed.

- [ ] **Step 3: Verify the file still compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit 2>&1 | grep -i "queries.ts" | head -10
```

Expected: no errors on `queries.ts`.

---

### Task 4: Update `getAllThreads` and `getThreadsByCategory` With `top` Sort + Time Filter

**Files:**
- Modify: `src/modules/forum/lib/queries.ts` (around lines 375-443 for `getAllThreads`, and the `getThreadsByCategory` function)

- [ ] **Step 1: Update `getAllThreads` signature to accept `timePeriod`**

Change the function signature from:
```ts
export async function getAllThreads(
  sort: 'hot' | 'new' | 'top' = 'hot',
  page: number = 1,
  categorySlug?: string,
) {
```

To:
```ts
export async function getAllThreads(
  sort: 'hot' | 'new' | 'top' = 'hot',
  page: number = 1,
  categorySlug?: string,
  timePeriod: 'day' | 'week' | 'month' | 'all' = 'week',
) {
```

- [ ] **Step 2: Add the `top` time filter to the `where` clause**

After the `where` is defined (around line 380-382), add:

```ts
  // Time filter only applies to `top` sort
  const topCutoff: Date | null =
    sort === 'top' && timePeriod !== 'all'
      ? new Date(Date.now() - { day: 1, week: 7, month: 30 }[timePeriod] * 86_400_000)
      : null

  const whereWithTime = topCutoff
    ? { ...where, createdAt: { gte: topCutoff } }
    : where
```

Then replace both usages of `where` in `db.forumThread.findMany` and `db.forumThread.count` with `whereWithTime`.

- [ ] **Step 3: Fix the `top` branch of `orderBy` to use `voteScore`**

Change:
```ts
  const orderBy =
    sort === 'hot' ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
    : sort === 'new' ? [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
```

To:
```ts
  const orderBy =
    sort === 'hot' ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
    : sort === 'new' ? [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ isPinned: 'desc' as const }, { voteScore: 'desc' as const }]
```

- [ ] **Step 4: Find `getThreadsByCategory` and update its signature + internals**

The current function signature (around line 49 of `queries.ts`) is:
```ts
export async function getThreadsByCategory(
  categorySlug: string,
  page: number = 1,
) {
```

Update to:
```ts
export async function getThreadsByCategory(
  categorySlug: string,
  page: number = 1,
  sort: 'hot' | 'new' | 'top' = 'hot',
  timePeriod: 'day' | 'week' | 'month' | 'all' = 'week',
) {
```

Then, after `if (!category) return null`, add the same time-filter + orderBy logic:

```ts
  const topCutoff: Date | null =
    sort === 'top' && timePeriod !== 'all'
      ? new Date(Date.now() - { day: 1, week: 7, month: 30 }[timePeriod] * 86_400_000)
      : null

  const baseWhere = { categoryId: category.id, deletedAt: null }
  const whereWithTime = topCutoff
    ? { ...baseWhere, createdAt: { gte: topCutoff } }
    : baseWhere

  const orderBy =
    sort === 'hot' ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
    : sort === 'new' ? [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ isPinned: 'desc' as const }, { voteScore: 'desc' as const }]
```

Replace the existing `db.forumThread.findMany` call's `where` with `whereWithTime` and its `orderBy` with the new `orderBy` variable. Also replace the `count` call's `where` with `whereWithTime`.

Note: The existing `where` in this function is `{ categoryId: category.id, deletedAt: null }` — replace that inline object with `whereWithTime` in both the `findMany` and `count` calls.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "queries.ts" | head -10
```

Expected: no errors.

---

### Task 5: Wire Sort UI — Time Filter in `ForumSortTabs` + Forum Pages

**Files:**
- Modify: `src/modules/forum/components/ForumSortTabs.tsx`
- Modify: `src/app/forum/page.tsx`
- Modify: `src/app/forum/[categorySlug]/page.tsx`

- [ ] **Step 1: Update `ForumSortTabs` to show time filter when `sort=top`**

Open `src/modules/forum/components/ForumSortTabs.tsx`. The component currently reads `sort` from `useSearchParams` and pushes `?sort=...` updates. Add a time period selector that appears below the sort tabs when `sort === 'top'`:

```tsx
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Flame, Clock, TrendingUp } from 'lucide-react'

const TIME_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
] as const

export function ForumSortTabs() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const sort = (searchParams.get('sort') ?? 'hot') as 'hot' | 'new' | 'top'
  const timePeriod = (searchParams.get('t') ?? 'week') as 'day' | 'week' | 'month' | 'all'

  function setSort(newSort: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', newSort)
    params.delete('page')
    if (newSort !== 'top') params.delete('t')
    router.push(`${pathname}?${params.toString()}`)
  }

  function setTimePeriod(t: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('t', t)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const tabs = [
    { value: 'hot', label: 'Hot', icon: Flame },
    { value: 'new', label: 'New', icon: Clock },
    { value: 'top', label: 'Top', icon: TrendingUp },
  ]

  return (
    <div className="mb-4">
      <div className="flex gap-1">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSort(value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              sort === value
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      {sort === 'top' && (
        <div className="mt-2 flex gap-1">
          {TIME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimePeriod(value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timePeriod === value
                  ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Skip — forum home page is categories-only**

`src/app/forum/page.tsx` renders only `CategoryList` — it has no thread feed. Sorting is handled entirely in the category slug pages (Step 3). No changes needed here.

- [ ] **Step 3: Update the category slug page to pass sort + timePeriod, and fix pagination to preserve query params**

Open `src/app/forum/[categorySlug]/page.tsx`. Replace the `CategoryPageProps` interface, `generateMetadata`, and the page component with this full replacement (keep all existing imports):

```tsx
const PAGE_SIZE = 25

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ sort?: string; t?: string; page?: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const result = await getThreadsByCategory(categorySlug, 1)
  if (!result) return { title: 'Category Not Found | Forum | Ride MTB' }

  return {
    title: `${result.category.name} | Forum | Ride MTB`,
    description: `Browse discussions in ${result.category.name} on the Ride MTB community forum.`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { categorySlug } = await params
  const sp = await searchParams
  const sort = (['hot', 'new', 'top'].includes(sp.sort ?? '') ? sp.sort : 'hot') as 'hot' | 'new' | 'top'
  const timePeriod = (['day', 'week', 'month', 'all'].includes(sp.t ?? '') ? sp.t : 'week') as 'day' | 'week' | 'month' | 'all'
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const [result, session] = await Promise.all([
    getThreadsByCategory(categorySlug, page, sort, timePeriod),
    auth(),
  ])

  if (!result) notFound()

  const { category, threads, totalCount } = result
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Build a helper to construct pagination URLs that preserve sort + time params
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (sort !== 'hot') params.set('sort', sort)
    if (sort === 'top' && timePeriod !== 'week') params.set('t', timePeriod)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/forum/${categorySlug}${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/forum"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All categories
      </Link>

      {/* Category header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {category.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalCount} {totalCount === 1 ? 'thread' : 'threads'}
          </p>
        </div>

        {session?.user && (
          <Link href={`/forum/${categorySlug}/new`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Thread
            </Button>
          </Link>
        )}
      </div>

      {/* Thread feed */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <ForumSortTabs />
        <ForumFeed threads={threads} categorySlug={categorySlug} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={pageUrl(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-sm text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={pageUrl(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}
```

Note: `ForumSortTabs` is placed inside the page JSX directly above `<ForumFeed>` — not inside `ForumFeed` itself. Add the import at the top of the file:
```tsx
import { ForumFeed, ForumSortTabs } from '@/modules/forum'
```
(or the appropriate module barrel path — check what `ForumFeed` is currently imported from and use the same source for `ForumSortTabs`)

- [ ] **Step 4: Ensure `ForumSortTabs` is exported from the module barrel**

`ForumSortTabs` is placed in the category page (Step 3), not inside `ForumFeed`. Check that it's exported from `src/modules/forum/index.ts` (the module barrel). Open that file and add the export if missing:

```ts
export { ForumSortTabs } from './components/ForumSortTabs'
```

Do NOT add `ForumSortTabs` inside `ForumFeed.tsx` — it's a client component that must live in the page component tree where `searchParams` data flows from.

- [ ] **Step 5: Smoke test — visit the forum and test sort tabs**

```bash
# Start dev server if not running
cd /Users/kylewarner/Documents/ride-mtb
npx next dev --turbopack --port 3000
```

Visit `http://localhost:3000/forum`. Click Hot → New → Top. Verify URL changes. Click "This Week / All Time" when on Top. Verify time filter appears/disappears.

- [ ] **Step 6: Commit**

```bash
git add src/modules/forum/lib/queries.ts src/modules/forum/components/ForumSortTabs.tsx src/modules/forum/index.ts src/app/forum/[categorySlug]/page.tsx
git commit -m "feat(forum): feed sorting — top sort with voteScore + time filters"
```

---

## Chunk 3: Data Migration

### Task 6: Create Migration Script

**Files:**
- Create: `scripts/migrate-forum.ts`
- Create: `scripts/.env.migrate.example`

- [ ] **Step 1: Create the env example file**

```bash
cat > /Users/kylewarner/Documents/ride-mtb/scripts/.env.migrate.example << 'EOF'
# Standalone forum Docker PostgreSQL (starts with: docker start <container>)
STANDALONE_FORUM_DATABASE_URL="postgresql://postgres:postgres@localhost:5443/ridemtbforum"

# Monolith Supabase direct connection (from monolith .env.local)
# DATABASE_DIRECT_URL is already set in .env.local — the script reads it from there
EOF
```

- [ ] **Step 2: Create `scripts/migrate-forum.ts`**

```typescript
/**
 * Migrate standalone forum data into the monolith's Supabase.
 *
 * Prerequisites:
 *   1. Standalone forum Docker container must be running:
 *      docker start <your-ridemtbforum-container>
 *   2. Run from monolith root: npx tsx scripts/migrate-forum.ts [--dry-run]
 *
 * The script is idempotent — safe to run multiple times.
 */
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🔍 DRY RUN — no writes will happen\n')

// ── DB connections ────────────────────────────────────────────
const src = new Pool({
  connectionString: process.env.STANDALONE_FORUM_DATABASE_URL
    ?? 'postgresql://postgres:postgres@localhost:5443/ridemtbforum',
})

const dest = new Pool({
  connectionString: process.env.DATABASE_DIRECT_URL,
})

if (!process.env.DATABASE_DIRECT_URL) {
  console.error('❌ DATABASE_DIRECT_URL not set in .env.local')
  process.exit(1)
}

// ── Counters ─────────────────────────────────────────────────
const stats: Record<string, { ok: number; skip: number; err: number }> = {}
function counter(key: string) {
  if (!stats[key]) stats[key] = { ok: 0, skip: 0, err: 0 }
  return stats[key]
}

async function upsert(table: string, data: Record<string, unknown>, conflictCol = 'id') {
  if (DRY_RUN) { counter(table).ok++; return }
  const keys = Object.keys(data)
  const vals = Object.values(data)
  const cols = keys.map(k => `"${k}"`).join(', ')
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const updates = keys
    .filter(k => k !== conflictCol)
    .map(k => `"${k}" = EXCLUDED."${k}"`)
    .join(', ')

  try {
    await dest.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
       ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updates}`,
      vals,
    )
    counter(table).ok++
  } catch (e) {
    counter(table).err++
    console.error(`  ⚠ ${table} row failed:`, (e as Error).message)
  }
}

// ── Step 1: Users ─────────────────────────────────────────────
async function migrateUsers(): Promise<Map<string, string>> {
  console.log('1/11 Migrating users...')
  const { rows } = await src.query(
    `SELECT id, email, name, username, "createdAt" FROM "User"`,
  )

  const idMap = new Map<string, string>()

  for (const row of rows) {
    const email = row.email ?? `${row.username ?? row.id}@legacy.ridemtb.com`

    // Check if user already exists in dest
    const existing = await dest.query(
      `SELECT id FROM "users" WHERE email = $1 LIMIT 1`,
      [email],
    )

    if (existing.rows.length > 0) {
      idMap.set(row.id, existing.rows[0].id)
      counter('users').skip++
      continue
    }

    // Create dormant account
    const hashedPassword = await bcrypt.hash(
      Math.random().toString(36) + Math.random().toString(36),
      10,
    )
    const newId = `migrated-${row.id}`

    if (!DRY_RUN) {
      await dest.query(
        `INSERT INTO "users" (id, email, name, username, password, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW())
         ON CONFLICT (email) DO UPDATE SET "updatedAt" = NOW()
         RETURNING id`,
        [newId, email, row.name ?? row.username, row.username, hashedPassword, row.createdAt],
      )
    }

    idMap.set(row.id, DRY_RUN ? newId : (
      (await dest.query(`SELECT id FROM "users" WHERE email = $1`, [email])).rows[0]?.id ?? newId
    ))
    counter('users').ok++
  }

  console.log(`  ✓ users: ${counter('users').ok} migrated, ${counter('users').skip} matched existing, ${counter('users').err} errors`)
  return idMap
}

// ── Step 2: ForumCategory ─────────────────────────────────────
async function migrateCategories(): Promise<Map<string, string>> {
  console.log('2/11 Migrating categories...')
  const { rows } = await src.query(
    `SELECT id, name, slug, description, "sortOrder", "createdAt" FROM "Category"`,
  )
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const destId = `migrated-cat-${row.id}`
    await upsert('forum_categories', {
      id: destId,
      name: row.name,
      slug: `migrated-${row.slug}`,
      description: row.description,
      sortOrder: row.sortOrder ?? 0,
      color: '#6b7280',
      isGated: false,
      memberCount: 0,
    })
    idMap.set(row.id, destId)
  }

  console.log(`  ✓ categories: ${counter('forum_categories').ok} ok, ${counter('forum_categories').err} errors`)
  return idMap
}

// ── Step 3: ForumTag ──────────────────────────────────────────
async function migrateTags(): Promise<Map<string, string>> {
  console.log('3/11 Migrating tags...')
  const { rows } = await src.query(`SELECT id, name, slug FROM "Tag"`)
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const destId = `migrated-tag-${row.id}`
    await upsert('forum_tags', {
      id: destId,
      name: row.name,
      slug: row.slug,
      color: '#6b7280',
    })
    idMap.set(row.id, destId)
  }

  console.log(`  ✓ tags: ${counter('forum_tags').ok} ok, ${counter('forum_tags').err} errors`)
  return idMap
}

// ── Step 4: ForumThread (standalone Post → thread) ────────────
async function migrateThreads(
  userIdMap: Map<string, string>,
  categoryIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('4/11 Migrating threads...')
  // Standalone "Post" is a top-level discussion = ForumThread
  const { rows } = await src.query(
    `SELECT id, title, slug, "categoryId", "authorId", content, "isPinned",
            "isLocked", "viewCount", "createdAt", "updatedAt"
     FROM "Post" ORDER BY "createdAt" ASC`,
  )
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const threadId = `migrated-thread-${row.id}`
    const authorId = userIdMap.get(row.authorId) ?? null
    const categoryId = categoryIdMap.get(row.categoryId) ?? null
    if (!authorId || !categoryId) { counter('forum_threads').err++; continue }

    await upsert('forum_threads', {
      id: threadId,
      categoryId,
      title: row.title ?? '(Untitled)',
      slug: `migrated-${row.slug ?? row.id}`,
      isPinned: row.isPinned ?? false,
      isLocked: row.isLocked ?? false,
      viewCount: row.viewCount ?? 0,
      hotScore: 0,
      voteScore: 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })

    // Also create the "isFirst" post containing the thread body
    const firstPostId = `migrated-fp-${row.id}`
    await upsert('forum_posts', {
      id: firstPostId,
      threadId,
      authorId,
      content: row.content ?? '',
      isFirst: true,
      depth: 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })

    idMap.set(row.id, threadId)
  }

  console.log(`  ✓ threads: ${counter('forum_threads').ok} ok, ${counter('forum_threads').err} errors`)
  return idMap
}

// ── Step 5a: ForumPost flat pass (standalone Comment → reply) ─
async function migratePostsFlat(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('5a/11 Migrating posts (flat pass)...')
  const { rows } = await src.query(
    `SELECT id, "postId" as "threadId", "authorId", content, "parentId",
            "createdAt", "updatedAt"
     FROM "Comment" ORDER BY "createdAt" ASC`,
  )
  const idMap = new Map<string, string>()

  for (const row of rows) {
    const postId = `migrated-post-${row.id}`
    const authorId = userIdMap.get(row.authorId) ?? null
    const threadId = threadIdMap.get(row.threadId) ?? null
    if (!authorId || !threadId) { counter('forum_posts').err++; continue }

    await upsert('forum_posts', {
      id: postId,
      threadId,
      authorId,
      content: row.content ?? '',
      isFirst: false,
      depth: 0,          // backfilled in 5b
      parentId: null,    // backfilled in 5b
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })

    idMap.set(row.id, postId)
  }

  console.log(`  ✓ posts flat: ${counter('forum_posts').ok} ok, ${counter('forum_posts').err} errors`)
  return idMap
}

// ── Step 5b: Backfill parentId + depth ───────────────────────
async function backfillPostParents(
  commentIdMap: Map<string, string>,
): Promise<void> {
  console.log('5b/11 Backfilling parentId + depth...')
  const { rows } = await src.query(
    `SELECT id, "parentId" FROM "Comment" WHERE "parentId" IS NOT NULL`,
  )

  let updated = 0
  for (const row of rows) {
    const destPostId = commentIdMap.get(row.id)
    const destParentId = commentIdMap.get(row.parentId)
    if (!destPostId || !destParentId) continue

    if (!DRY_RUN) {
      // Get parent depth
      const { rows: parentRows } = await dest.query(
        `SELECT depth FROM forum_posts WHERE id = $1`,
        [destParentId],
      )
      const parentDepth = parentRows[0]?.depth ?? 0
      const newDepth = Math.min(parentDepth + 1, 3)

      await dest.query(
        `UPDATE forum_posts SET "parentId" = $1, depth = $2 WHERE id = $3`,
        [destParentId, newDepth, destPostId],
      )
    }
    updated++
  }

  console.log(`  ✓ backfilled ${updated} post parents`)
}

// ── Step 6: ForumVote ─────────────────────────────────────────
async function migrateVotes(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
  commentIdMap: Map<string, string>,
): Promise<void> {
  console.log('6/11 Migrating votes...')
  const { rows } = await src.query(
    `SELECT id, "userId", "postId", "commentId", value FROM "Vote"`,
  )

  for (const row of rows) {
    const userId = userIdMap.get(row.userId)
    // Votes can be on a Post (thread) or Comment (post)
    let destPostId: string | null = null
    if (row.commentId) {
      destPostId = commentIdMap.get(row.commentId) ?? null
    } else if (row.postId) {
      // Vote on a thread → vote on its isFirst post
      const threadId = threadIdMap.get(row.postId)
      if (threadId) {
        const { rows: fp } = await dest.query(
          `SELECT id FROM forum_posts WHERE "threadId" = $1 AND "isFirst" = true LIMIT 1`,
          [threadId],
        )
        destPostId = fp[0]?.id ?? null
      }
    }

    if (!userId || !destPostId) { counter('forum_votes').err++; continue }

    await upsert('forum_votes', {
      id: `migrated-vote-${row.id}`,
      postId: destPostId,
      userId,
      value: row.value ?? 1,
    })
  }

  console.log(`  ✓ votes: ${counter('forum_votes').ok} ok, ${counter('forum_votes').err} errors`)
}

// ── Step 7: ForumThreadTag ────────────────────────────────────
async function migrateThreadTags(
  threadIdMap: Map<string, string>,
  tagIdMap: Map<string, string>,
): Promise<void> {
  console.log('7/11 Migrating thread tags...')
  const { rows } = await src.query(`SELECT "postId", "tagId" FROM "PostTag"`)

  for (const row of rows) {
    const threadId = threadIdMap.get(row.postId)
    const tagId = tagIdMap.get(row.tagId)
    if (!threadId || !tagId) { counter('forum_thread_tags').err++; continue }

    if (!DRY_RUN) {
      await dest.query(
        `INSERT INTO forum_thread_tags ("threadId", "tagId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [threadId, tagId],
      )
    }
    counter('forum_thread_tags').ok++
  }

  console.log(`  ✓ thread tags: ${counter('forum_thread_tags').ok} ok`)
}

// ── Step 8: ForumBookmark ─────────────────────────────────────
async function migrateBookmarks(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
): Promise<void> {
  console.log('8/11 Migrating bookmarks...')
  const { rows } = await src.query(`SELECT id, "userId", "postId", "createdAt" FROM "Bookmark"`)

  for (const row of rows) {
    const userId = userIdMap.get(row.userId)
    const threadId = threadIdMap.get(row.postId)   // standalone Bookmark.postId = Post (thread)
    if (!userId || !threadId) { counter('forum_bookmarks').err++; continue }

    await upsert('forum_bookmarks', {
      id: `migrated-bm-${row.id}`,
      userId,
      threadId,
      createdAt: row.createdAt,
    })
  }

  console.log(`  ✓ bookmarks: ${counter('forum_bookmarks').ok} ok`)
}

// ── Step 9: ForumBadge ────────────────────────────────────────
async function migrateBadges(): Promise<Map<string, string>> {
  console.log('9/11 Migrating badges...')
  const { rows } = await src.query(`SELECT id, name, slug, description, icon, color FROM "Badge"`)
  const idToSlug = new Map<string, string>()

  for (const row of rows) {
    await upsert('forum_badges', {
      id: `migrated-badge-${row.id}`,
      slug: row.slug,
      name: row.name,
      description: row.description ?? '',
      icon: row.icon ?? 'award',
      color: row.color ?? '#6b7280',
    })
    idToSlug.set(row.id, row.slug)
  }

  console.log(`  ✓ badges: ${counter('forum_badges').ok} ok`)
  return idToSlug
}

// ── Step 10: ForumUserBadge ───────────────────────────────────
async function migrateUserBadges(
  userIdMap: Map<string, string>,
  badgeIdToSlug: Map<string, string>,
): Promise<void> {
  console.log('10/11 Migrating user badges...')
  const { rows } = await src.query(`SELECT id, "userId", "badgeId", "awardedAt" FROM "UserBadge"`)

  for (const row of rows) {
    const userId = userIdMap.get(row.userId)
    const badgeSlug = badgeIdToSlug.get(row.badgeId)
    if (!userId || !badgeSlug) { counter('forum_user_badges').err++; continue }

    await upsert('forum_user_badges', {
      id: `migrated-ub-${row.id}`,
      userId,
      badgeSlug,
      awardedAt: row.awardedAt,
    })
  }

  console.log(`  ✓ user badges: ${counter('forum_user_badges').ok} ok`)
}

// ── Step 11: ForumReport ──────────────────────────────────────
async function migrateReports(
  userIdMap: Map<string, string>,
  threadIdMap: Map<string, string>,
  commentIdMap: Map<string, string>,
): Promise<void> {
  console.log('11/11 Migrating reports...')
  const { rows } = await src.query(
    `SELECT id, "reporterId", "postId", "commentId", reason, status, "createdAt" FROM "Report"`,
  )

  for (const row of rows) {
    const reporterId = userIdMap.get(row.reporterId)
    if (!reporterId) { counter('forum_reports').err++; continue }

    const threadId = row.postId ? threadIdMap.get(row.postId) : null
    const postId = row.commentId ? commentIdMap.get(row.commentId) : null

    await upsert('forum_reports', {
      id: `migrated-report-${row.id}`,
      reporterId,
      targetType: postId ? 'POST' : 'THREAD',
      threadId: threadId ?? null,
      postId: postId ?? null,
      reason: row.reason ?? 'migrated',
      status: row.status === 'resolved' ? 'CLOSED' : 'OPEN',
      createdAt: row.createdAt,
    })
  }

  console.log(`  ✓ reports: ${counter('forum_reports').ok} ok`)
}

// ── Recalculate hot scores after migration ────────────────────
async function recalculateScores(): Promise<void> {
  if (DRY_RUN) return
  console.log('\nRecalculating hot/vote scores for migrated threads...')
  const { rows: threads } = await dest.query(
    `SELECT id, "createdAt" FROM forum_threads WHERE id LIKE 'migrated-%'`,
  )

  for (const thread of threads) {
    const { rows: posts } = await dest.query(
      `SELECT id FROM forum_posts WHERE "threadId" = $1`,
      [thread.id],
    )
    const postIds = posts.map((p: { id: string }) => p.id)
    if (postIds.length === 0) continue

    const { rows: voteRows } = await dest.query(
      `SELECT COALESCE(SUM(value), 0) as score FROM forum_votes WHERE "postId" = ANY($1)`,
      [postIds],
    )
    const voteScore = parseInt(voteRows[0]?.score ?? '0', 10)
    const replyCount = Math.max(0, posts.length - 1)

    // Hot score: Reddit log10 formula
    const score = voteScore + replyCount * 2
    const order = Math.log10(Math.max(Math.abs(score), 1))
    const sign = score > 0 ? 1 : score < 0 ? -1 : 0
    const timestamp = new Date(thread.createdAt).getTime() / 1000
    const hotScore = order + (sign * timestamp) / 45000

    await dest.query(
      `UPDATE forum_threads SET "hotScore" = $1, "voteScore" = $2 WHERE id = $3`,
      [hotScore, voteScore, thread.id],
    )
  }
  console.log(`  ✓ Recalculated scores for ${threads.length} threads`)
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Forum migration starting (${DRY_RUN ? 'DRY RUN' : 'LIVE'})\n`)

  const userIdMap = await migrateUsers()
  const categoryIdMap = await migrateCategories()
  const tagIdMap = await migrateTags()
  const threadIdMap = await migrateThreads(userIdMap, categoryIdMap)
  const commentIdMap = await migratePostsFlat(userIdMap, threadIdMap)
  await backfillPostParents(commentIdMap)
  await migrateVotes(userIdMap, threadIdMap, commentIdMap)
  await migrateThreadTags(threadIdMap, tagIdMap)
  await migrateBookmarks(userIdMap, threadIdMap)
  const badgeIdToSlug = await migrateBadges()
  await migrateUserBadges(userIdMap, badgeIdToSlug)
  await migrateReports(userIdMap, threadIdMap, commentIdMap)
  await recalculateScores()

  console.log('\n📊 Migration summary:')
  for (const [table, s] of Object.entries(stats)) {
    console.log(`  ${table}: ${s.ok} ok, ${s.skip} skipped, ${s.err} errors`)
  }
  console.log('\n✅ Done!')

  await src.end()
  await dest.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Commit the migration script**

```bash
git add scripts/migrate-forum.ts scripts/.env.migrate.example
git commit -m "feat(forum): data migration script from standalone forum"
```

---

### Task 7: Run the Migration

**Prerequisites:** The standalone forum Docker container must be running.

- [ ] **Step 1: Start the standalone forum's Docker container**

```bash
# Find the container (look for one using port 5443)
docker ps -a | grep 5443
# Start it (replace <container_name> with actual name from above)
docker start <container_name>

# Verify it's running
docker ps | grep 5443
```

Expected: a running container bound to `0.0.0.0:5443->5432/tcp`.

- [ ] **Step 2: Run dry-run to verify the migration reads correctly**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsx scripts/migrate-forum.ts --dry-run
```

Expected output like:
```
🚀 Forum migration starting (DRY RUN)

1/11 Migrating users...
  ✓ users: 12 migrated, 0 matched existing, 0 errors
2/11 Migrating categories...
  ✓ categories: 5 ok, 0 errors
...
✅ Done!
```

If any step shows errors, investigate the column names against the standalone's actual schema using:
```bash
docker exec <container_name> psql -U postgres ridemtbforum -c "\d \"Comment\""
```

- [ ] **Step 3: Run the real migration**

```bash
npx tsx scripts/migrate-forum.ts
```

Expected: same output without `DRY RUN`, with `✅ Done!`.

- [ ] **Step 4: Verify data in Supabase**

```bash
# Quick row count check
npx tsx -e "
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const pool = new Pool({ connectionString: process.env.DATABASE_DIRECT_URL })
const tables = ['forum_threads', 'forum_posts', 'forum_votes', 'forum_tags', 'forum_bookmarks']
for (const t of tables) {
  const { rows } = await pool.query('SELECT COUNT(*) FROM ' + t)
  console.log(t + ':', rows[0].count)
}
await pool.end()
"
```

Expected: non-zero counts in all tables.

---

## Chunk 4: Nested Replies

### Task 8: Extend `createPost` Query to Support `parentId`

**Files:**
- Modify: `src/modules/forum/lib/queries.ts` (the `createPost` function and its input type)

- [ ] **Step 1: Find the `CreatePostInput` type and the `createPost` function in queries.ts**

Search for `CreatePostInput` or `createPost`. It likely looks like:

```ts
interface CreatePostInput {
  threadId: string
  authorId: string
  content: string
}

export async function createPost({ threadId, authorId, content }: CreatePostInput) {
  // checks thread, creates post
}
```

- [ ] **Step 2: Add `parentId` to the input type**

```ts
interface CreatePostInput {
  threadId: string
  authorId: string
  content: string
  parentId?: string
}
```

- [ ] **Step 3: Wrap the function body in a `db.$transaction` with depth validation**

Replace the function body with:

```ts
export async function createPost({ threadId, authorId, content, parentId }: CreatePostInput) {
  return db.$transaction(async (tx) => {
    const thread = await tx.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, isLocked: true },
    })
    if (!thread) throw new Error('Thread not found')
    if (thread.isLocked) throw new Error('Thread is locked')

    let depth = 0
    let resolvedParentId: string | null = null

    if (parentId) {
      const parent = await tx.forumPost.findUnique({
        where: { id: parentId },
        select: { id: true, depth: true, threadId: true },
      })
      if (!parent) throw new Error('Parent post not found')
      if (parent.threadId !== threadId) throw new Error('Parent post is not in this thread')
      if (parent.depth >= 3) throw new Error('Maximum reply depth reached')
      depth = parent.depth + 1
      resolvedParentId = parent.id
    }

    const post = await tx.forumPost.create({
      data: {
        threadId,
        authorId,
        content,
        isFirst: false,
        depth,
        parentId: resolvedParentId,
      },
    })

    await tx.forumThread.update({
      where: { id: threadId },
      data: { lastReplyAt: new Date() },
    })

    return post
  })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "queries.ts" | head -10
```

---

### Task 9: Update `createPost` Server Action to Accept `parentId`

**Files:**
- Modify: `src/modules/forum/actions/createPost.ts`

- [ ] **Step 1: Add `parentId` to the Zod schema**

Change:
```ts
const createPostSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z.string().min(1, 'Content is required').max(10000, ...),
})
```

To:
```ts
const createPostSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be at most 10,000 characters'),
  parentId: z.string().optional(),
})
```

- [ ] **Step 2: Read `parentId` from `formData` in the raw object**

Change:
```ts
    const raw = {
      threadId: formData.get('threadId'),
      content: formData.get('content'),
    }
```

To:
```ts
    const raw = {
      threadId: formData.get('threadId'),
      content: formData.get('content'),
      parentId: formData.get('parentId') ?? undefined,
    }
```

- [ ] **Step 3: Pass `parentId` to `createPostQuery`**

Change:
```ts
    const post = await createPostQuery({
      threadId,
      authorId: user.id,
      content,
    })
```

To:
```ts
    const { threadId, content, parentId } = parsed.data
    const post = await createPostQuery({
      threadId,
      authorId: user.id,
      content,
      parentId,
    })
```

- [ ] **Step 4: Add a new error case for max depth**

In the catch block, add:
```ts
    if (error instanceof Error && error.message.includes('Maximum reply depth')) {
      return { errors: { general: 'You cannot reply this deep in a thread.' } }
    }
```

---

### Task 10: Update `getThreadBySlug` to Nested 4-Level Include

**Files:**
- Modify: `src/modules/forum/lib/queries.ts` (the `getThreadBySlug` function, lines ~133-203)

- [ ] **Step 1: Replace the flat `posts` include with a nested one**

The current query includes `posts: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, include: { author: { ... } } }`.

The author select block is:
```ts
author: {
  select: {
    id: true, name: true, username: true, image: true, avatarUrl: true,
    forumBadges: {
      select: { badgeSlug: true, awardedAt: true, badge: { select: { name: true, description: true, icon: true, color: true } } },
      orderBy: { awardedAt: 'asc' }, take: 3,
    },
  },
},
```

Replace the entire `posts: { ... }` block with:

```ts
posts: {
  where: { isFirst: false, parentId: null, deletedAt: null },
  orderBy: { createdAt: 'asc' },
  include: {
    author: {
      select: {
        id: true, name: true, username: true, image: true, avatarUrl: true,
        forumBadges: {
          select: { badgeSlug: true, awardedAt: true, badge: { select: { name: true, description: true, icon: true, color: true } } },
          orderBy: { awardedAt: 'asc' }, take: 3,
        },
      },
    },
    replies: {
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, username: true, image: true, avatarUrl: true } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, username: true, image: true, avatarUrl: true } },
            replies: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { id: true, name: true, username: true, image: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    },
  },
},
```

- [ ] **Step 2: Update the vote score computation to handle nested posts**

The current code computes vote scores for `thread.posts`. With nested replies, votes need to be fetched for ALL posts (at any depth). Update the post IDs collection:

```ts
  // Collect ALL post IDs recursively
  function collectPostIds(posts: { id: string; replies?: { id: string; replies?: unknown[] }[] }[]): string[] {
    return posts.flatMap(p => [p.id, ...collectPostIds((p.replies ?? []) as typeof posts)])
  }
  const postIds = collectPostIds(thread.posts as Parameters<typeof collectPostIds>[0])
```

The rest of the vote score logic stays the same (groupBy, scoreMap). Then when mapping posts to add `voteScore`, apply it recursively too or just flat-map — the simplest approach is to attach scores to all posts regardless of depth using the same `scoreMap`:

```ts
  function attachScores<T extends { id: string; replies?: T[] }>(posts: T[]): (T & { voteScore: number })[] {
    return posts.map(p => ({
      ...p,
      voteScore: scoreMap.get(p.id) ?? 0,
      replies: p.replies ? attachScores(p.replies) : undefined,
    }))
  }
  const postsWithScores = attachScores(thread.posts as Parameters<typeof attachScores>[0])
```

---

### Task 11: Build `NestedReplies` Component

**Files:**
- Create: `src/modules/forum/components/NestedReplies.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { PostCard } from './PostCard'

// Types mirror the nested shape returned by getThreadBySlug
interface NestedPost {
  id: string
  content: string
  createdAt: Date
  editedAt: Date | null
  deletedAt: Date | null
  isFirst: boolean
  depth: number
  parentId: string | null
  voteScore: number
  threadId: string
  author: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    avatarUrl: string | null
    forumBadges?: unknown[]
  }
  replies?: NestedPost[]
}

interface NestedRepliesProps {
  posts: NestedPost[]
  threadId: string
  isLocked: boolean
  currentUserId: string | null
  currentUserRole: string | null
  onVote: (postId: string, value: 1 | -1) => void
  categoryColor?: string
}

const BORDER_COLORS = [
  'border-[var(--color-primary)]',
  'border-[var(--color-primary)]/60',
  'border-[var(--color-primary)]/30',
  'border-[var(--color-border)]',
]

function PostWithReplies({
  post,
  threadId,
  isLocked,
  currentUserId,
  currentUserRole,
  onVote,
  depth = 0,
}: {
  post: NestedPost
  threadId: string
  isLocked: boolean
  currentUserId: string | null
  currentUserRole: string | null
  onVote: (postId: string, value: 1 | -1) => void
  depth?: number
}) {
  const [showReplies, setShowReplies] = useState(depth < 2)
  const replyCount = post.replies?.length ?? 0

  return (
    <div className={depth > 0 ? `ml-4 border-l-2 pl-4 ${BORDER_COLORS[Math.min(depth, 3)]}` : ''}>
      <PostCard
        post={post}
        threadId={threadId}
        isLocked={isLocked}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onVote={onVote}
        showReplyButton={depth < 3 && !isLocked}
        replyParentId={post.id}
      />

      {replyCount > 0 && depth >= 2 && !showReplies && (
        <button
          onClick={() => setShowReplies(true)}
          className="mb-2 ml-4 text-xs text-[var(--color-primary)] hover:underline"
        >
          Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {(showReplies || depth < 2) && post.replies?.map((reply) => (
        <PostWithReplies
          key={reply.id}
          post={reply}
          threadId={threadId}
          isLocked={isLocked}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onVote={onVote}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export function NestedReplies({
  posts,
  threadId,
  isLocked,
  currentUserId,
  currentUserRole,
  onVote,
}: NestedRepliesProps) {
  if (posts.length === 0) return null

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <PostWithReplies
          key={post.id}
          post={post}
          threadId={threadId}
          isLocked={isLocked}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onVote={onVote}
          depth={0}
        />
      ))}
    </div>
  )
}
```

---

### Task 12: Update `ReplyForm` to Accept `parentId`

**Files:**
- Modify: `src/modules/forum/components/ReplyForm.tsx`

- [ ] **Step 1: Add `parentId` and `onSuccess` props**

Find the `ReplyForm` props interface and add:

```ts
interface ReplyFormProps {
  threadId: string
  isLocked?: boolean
  parentId?: string          // new
  onSuccess?: () => void     // new — collapse inline reply on success
}
```

- [ ] **Step 2: Add a hidden `parentId` input to the form**

Inside the `<form>` element, add after the `threadId` hidden input:

```tsx
{parentId && <input type="hidden" name="parentId" value={parentId} />}
```

- [ ] **Step 3: Call `onSuccess` when the form submits successfully**

If the component uses `useFormState`, call `onSuccess()` in the effect that watches for `state.success`:

```tsx
useEffect(() => {
  if (state?.success) {
    onSuccess?.()
  }
}, [state?.success, onSuccess])
```

---

### Task 13: Update `ThreadView` to Render `NestedReplies`

**Files:**
- Modify: `src/modules/forum/components/ThreadView.tsx`

- [ ] **Step 1: Import `NestedReplies`**

```ts
import { NestedReplies } from './NestedReplies'
```

- [ ] **Step 2: Replace the flat `posts.map(PostCard)` with `NestedReplies`**

Find where `ThreadView` currently maps posts to `PostCard` components (after the first/OP post). Replace:

```tsx
{/* Reply posts */}
{thread.posts.filter(p => !p.isFirst).map(post => (
  <PostCard key={post.id} post={post} ... />
))}
```

With:

```tsx
{/* Reply posts — nested tree */}
<NestedReplies
  posts={thread.posts.filter(p => !p.isFirst)}
  threadId={thread.id}
  isLocked={thread.isLocked}
  currentUserId={currentUserId}
  currentUserRole={currentUserRole}
  onVote={onVote}
  categoryColor={thread.category.color}
/>
```

- [ ] **Step 3: Make `PostCard` accept `showReplyButton` and `replyParentId` props**

Open `src/modules/forum/components/PostCard.tsx`. Add these props to the interface:

```ts
showReplyButton?: boolean
replyParentId?: string
```

When `showReplyButton` is true, render an inline "Reply" button that toggles a `ReplyForm` below the post, passing `parentId={replyParentId}`.

- [ ] **Step 4: Smoke test nested replies**

1. Start dev server
2. Navigate to any forum thread
3. Verify existing replies still display
4. Reply to a post (not the OP) — verify it appears indented under the parent
5. Reply to a reply — verify 3 levels work
6. Attempting depth 4 reply: reply button should be hidden

- [ ] **Step 5: Commit**

```bash
git add src/modules/forum/lib/queries.ts src/modules/forum/actions/createPost.ts src/modules/forum/components/NestedReplies.tsx src/modules/forum/components/ReplyForm.tsx src/modules/forum/components/ThreadView.tsx src/modules/forum/components/PostCard.tsx
git commit -m "feat(forum): nested replies — max depth 3 with threaded UI"
```

---

## Chunk 5: Notifications

### Task 14: Create `notifications.ts` Helper

**Files:**
- Create: `src/modules/forum/lib/notifications.ts`

- [ ] **Step 1: Create the file**

```ts
import { db } from '@/lib/db/client'

type NotificationType = 'REPLY_TO_THREAD' | 'REPLY_TO_POST' | 'MENTION' | 'VOTE_MILESTONE'

interface CreateNotificationInput {
  type: NotificationType
  userId: string          // recipient
  actorId?: string        // who triggered it (null for system)
  threadId?: string
  postId?: string
  meta?: Record<string, unknown>
}

/**
 * Creates a ForumNotification if deduplication check passes.
 * Always fire-and-forget — wrap call in void + try/catch.
 */
export async function createForumNotification(input: CreateNotificationInput): Promise<void> {
  const { type, userId, actorId, threadId, postId, meta } = input

  // Never notify yourself
  if (actorId && actorId === userId) return

  // Deduplication: check for existing notification with same key
  if (type === 'VOTE_MILESTONE') {
    // Milestones never re-fire — check any time range
    const threshold = (meta as { threshold?: number })?.threshold
    const existing = await db.forumNotification.findFirst({
      where: {
        type: 'VOTE_MILESTONE',
        postId: postId ?? null,
        userId,
        // Use raw filter for JSON field — check if threshold matches
      },
      select: { id: true, meta: true },
    })
    // Check threshold in application code (Prisma JSON filters are limited)
    if (existing) {
      const existingMeta = existing.meta as { threshold?: number } | null
      if (existingMeta?.threshold === threshold) return
    }
  } else {
    // For actor-based notifications: dedup within 1 hour
    const oneHourAgo = new Date(Date.now() - 3_600_000)
    const existing = await db.forumNotification.findFirst({
      where: {
        type,
        userId,
        actorId: actorId ?? null,
        ...(threadId ? { threadId } : {}),
        ...(postId ? { postId } : {}),
        createdAt: { gte: oneHourAgo },
      },
      select: { id: true },
    })
    if (existing) return
  }

  await db.forumNotification.create({
    data: {
      type,
      userId,
      actorId: actorId ?? null,
      threadId: threadId ?? null,
      postId: postId ?? null,
      meta: meta ?? null,
      read: false,
    },
  })
}

/**
 * Extracts @username mentions from post content.
 */
export function extractMentions(content: string): string[] {
  return [...content.matchAll(/@([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
}
```

---

### Task 15: Wire Notifications Into `createPost` Action

**Files:**
- Modify: `src/modules/forum/actions/createPost.ts`

- [ ] **Step 1: Import the notification helpers**

Add to the top of `createPost.ts`:

```ts
// eslint-disable-next-line no-restricted-imports
import { createForumNotification, extractMentions } from '../lib/notifications'
```

- [ ] **Step 2: Add in-app notification creation inside the existing fire-and-forget block**

Inside the `void (async () => { ... })()` block, after the existing email notification code, add:

```ts
        // ── In-app notifications ────────────────────────────
        // REPLY_TO_THREAD: notify thread author
        if (thread && threadAuthorId && threadAuthorId !== user.id) {
          await createForumNotification({
            type: 'REPLY_TO_THREAD',
            userId: threadAuthorId,
            actorId: user.id,
            threadId,
            postId: post.id,
          })
        }

        // REPLY_TO_POST: notify parent post author (for nested replies)
        if (parsed.data.parentId) {
          const parentPost = await db.forumPost.findUnique({
            where: { id: parsed.data.parentId },
            select: { authorId: true },
          })
          if (parentPost && parentPost.authorId !== user.id) {
            await createForumNotification({
              type: 'REPLY_TO_POST',
              userId: parentPost.authorId,
              actorId: user.id,
              threadId,
              postId: post.id,
            })
          }
        }

        // MENTION: notify @mentioned users
        const mentionedUsernames = extractMentions(content)
        if (mentionedUsernames.length > 0 && thread) {
          const mentionedUsers = await db.user.findMany({
            where: { username: { in: mentionedUsernames }, NOT: { id: user.id } },
            select: { id: true },
          })
          for (const mentioned of mentionedUsers) {
            await createForumNotification({
              type: 'MENTION',
              userId: mentioned.id,
              actorId: user.id,
              threadId,
              postId: post.id,
            })
          }
        }
```

Note: `parsed.data.parentId` needs to be accessible inside the fire-and-forget block. Make sure `parsed.data` is declared in the outer scope or capture `parentId` as a local variable before the fire-and-forget block.

---

### Task 16: Wire `VOTE_MILESTONE` Into `votePost` Action

**Files:**
- Modify: `src/modules/forum/actions/votePost.ts`

- [ ] **Step 1: Import the notification helper**

```ts
// eslint-disable-next-line no-restricted-imports
import { createForumNotification } from '../lib/notifications'
```

- [ ] **Step 2: Add milestone check inside the existing fire-and-forget block**

Inside the `void (async () => { ... })()` block in `votePost.ts`, after the `checkAndGrantBadges` call, add:

```ts
        // ── Vote milestone notifications ─────────────────────
        if (votedPost) {
          const currentScore = await db.forumVote.aggregate({
            where: { postId },
            _sum: { value: true },
          })
          const score = currentScore._sum.value ?? 0
          const MILESTONES = [10, 50, 100]
          for (const threshold of MILESTONES) {
            if (score >= threshold) {
              await createForumNotification({
                type: 'VOTE_MILESTONE',
                userId: votedPost.authorId,
                actorId: undefined,       // system event
                postId,
                meta: { threshold },
              })
            }
          }
        }
```

---

### Task 17: Create API Routes for Notifications

**Files:**
- Create: `src/app/api/forum/notifications/route.ts`
- Create: `src/app/api/forum/notifications/read/route.ts`

- [ ] **Step 1: Create `GET /api/forum/notifications` — unread count**

```ts
// src/app/api/forum/notifications/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ unreadCount: 0 })
  }

  const unreadCount = await db.forumNotification.count({
    where: { userId: session.user.id, read: false },
  })

  return NextResponse.json({ unreadCount })
}
```

- [ ] **Step 2: Create `POST /api/forum/notifications/read` — mark all read**

```ts
// src/app/api/forum/notifications/read/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.forumNotification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
```

---

### Task 18: `NotificationBell` Component + Notifications Page

**Files:**
- Create: `src/modules/forum/components/NotificationBell.tsx`
- Create: `src/app/forum/notifications/page.tsx`

- [ ] **Step 1: Create `NotificationBell.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/forum/notifications')
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {})
  }, [])

  return (
    <Link href="/forum/notifications" className="relative inline-flex items-center p-1.5">
      <Bell className="h-5 w-5 text-[var(--color-text-muted)]" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Add `NotificationBell` to the forum layout or nav**

Find the forum nav/header (likely in `src/app/forum/layout.tsx` or in `ForumSidebar.tsx`). Import and add `<NotificationBell />` next to the user menu or in the top bar.

- [ ] **Step 3: Create the notifications page**

```tsx
// src/app/forum/notifications/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, MessageSquare, Reply, AtSign, TrendingUp } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { MarkAllReadButton } from '@/modules/forum/components/MarkAllReadButton'

export const metadata: Metadata = { title: 'Notifications | Ride MTB Forum' }

const TYPE_CONFIG = {
  REPLY_TO_THREAD: { icon: MessageSquare, label: 'replied to your thread' },
  REPLY_TO_POST: { icon: Reply, label: 'replied to your post' },
  MENTION: { icon: AtSign, label: 'mentioned you' },
  VOTE_MILESTONE: { icon: TrendingUp, label: 'votes milestone reached' },
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const notifications = await db.forumNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      actor: { select: { name: true, username: true, image: true } },
      thread: { select: { title: true, slug: true } },
    },
  })

  // Mark all as read (server-side, no client needed)
  await db.forumNotification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--color-text-muted)]" />
          <h1 className="text-xl font-bold text-[var(--color-text)]">Notifications</h1>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No notifications yet.</p>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.REPLY_TO_THREAD
            const Icon = config.icon
            const href = n.thread
              ? `/forum/thread/${n.thread.slug}${n.postId ? `#${n.postId}` : ''}`
              : '/forum'

            return (
              <Link
                key={n.id}
                href={href}
                className={`flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-[var(--color-bg-secondary)] ${!n.read ? 'bg-[var(--color-primary)]/5' : ''}`}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                  <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text)]">
                    {n.actor ? (
                      <span className="font-semibold">{n.actor.name ?? n.actor.username}</span>
                    ) : (
                      <span className="font-semibold">Your post</span>
                    )}{' '}
                    {config.label}
                    {n.thread && (
                      <>
                        {' '}in{' '}
                        <span className="font-medium">{n.thread.title}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Smoke test notifications**

1. Create a thread as User A
2. Log in as User B and reply to the thread
3. Log back in as User A — the bell should show `1`
4. Click the bell → go to `/forum/notifications` → see the notification, badge resets to 0

- [ ] **Step 5: Commit**

```bash
git add src/modules/forum/lib/notifications.ts src/modules/forum/actions/createPost.ts src/modules/forum/actions/votePost.ts src/app/api/forum/notifications/route.ts src/app/api/forum/notifications/read/route.ts src/modules/forum/components/NotificationBell.tsx src/app/forum/notifications/page.tsx
git commit -m "feat(forum): in-app notifications — replies, mentions, vote milestones"
```

---

## Chunk 6: Link Preview

### Task 19: Create `link-preview.ts`

**Files:**
- Create: `src/modules/forum/lib/link-preview.ts`

- [ ] **Step 1: Create the file**

```ts
import { db } from '@/lib/db/client'

const PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
const FETCH_TIMEOUT_MS = 2_000
const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

interface LinkPreview {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
}

function extractFirstUrl(content: string): string | null {
  const match = content.match(/https?:\/\/[^\s"'<>]+/)
  if (!match) return null
  try {
    const u = new URL(match[0])
    // Skip internal links
    if (u.hostname.includes('ridemtb')) return null
    // Block private IPs
    if (PRIVATE_IP.test(u.hostname)) return null
    return u.href
  } catch {
    return null
  }
}

async function fetchOgData(url: string): Promise<Omit<LinkPreview, 'url'>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RideMTB/1.0 LinkPreview' },
    })
    if (!res.ok) return { title: null, description: null, imageUrl: null }
    const html = await res.text()

    const get = (prop: string): string | null => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ??
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))
      return m?.[1]?.trim() ?? null
    }

    const titleFallback = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null

    return {
      title: get('title') ?? titleFallback,
      description: get('description'),
      imageUrl: get('image'),
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fetches or returns cached link preview for the first URL found in `content`.
 * Returns null if no URL found, fetch fails, or no OG data available.
 */
export async function resolveContentLinkPreview(content: string): Promise<{ url: string; preview: LinkPreview } | null> {
  const url = extractFirstUrl(content)
  if (!url) return null

  // Check cache
  const cached = await db.forumLinkPreview.findUnique({ where: { url } })
  if (cached && Date.now() - cached.fetchedAt.getTime() < PREVIEW_TTL_MS) {
    return { url, preview: { url, title: cached.title, description: cached.description, imageUrl: cached.imageUrl } }
  }

  // Fetch fresh
  try {
    const data = await fetchOgData(url)
    if (!data.title && !data.description && !data.imageUrl) return null

    await db.forumLinkPreview.upsert({
      where: { url },
      update: { ...data, fetchedAt: new Date() },
      create: { url, ...data, fetchedAt: new Date() },
    })

    return { url, preview: { url, ...data } }
  } catch {
    return null
  }
}
```

---

### Task 20: Wire Link Preview Into `createPost` + `createThread` Actions

**Files:**
- Modify: `src/modules/forum/actions/createPost.ts`
- Modify: `src/modules/forum/actions/createThread.ts`

- [ ] **Step 1: Add link preview to `createPost`**

Import at top of `createPost.ts`:
```ts
// eslint-disable-next-line no-restricted-imports
import { resolveContentLinkPreview } from '../lib/link-preview'
```

Inside the main try block, after `const post = await createPostQuery(...)`, add a fire-and-forget to save the resolved URL to the post:

```ts
    // Link preview (fire-and-forget)
    void resolveContentLinkPreview(content).then(async (result) => {
      if (result) {
        await db.forumPost.update({
          where: { id: post.id },
          data: { linkPreviewUrl: result.url },
        }).catch(() => {})
      }
    }).catch(() => {})
```

- [ ] **Step 2: Add link preview to `createThread`**

Import in `createThread.ts`:
```ts
// eslint-disable-next-line no-restricted-imports
import { resolveContentLinkPreview } from '../lib/link-preview'
```

After `const thread = await createThreadQuery(...)`, add:

```ts
    // Link preview (fire-and-forget)
    void resolveContentLinkPreview(content).then(async (result) => {
      if (result) {
        await db.forumThread.update({
          where: { id: thread.id },
          data: { linkPreviewUrl: result.url },
        }).catch(() => {})
      }
    }).catch(() => {})
```

---

### Task 21: Create `LinkPreviewCard` + Wire Into `PostCard`

**Files:**
- Create: `src/modules/forum/components/LinkPreviewCard.tsx`
- Modify: `src/modules/forum/components/PostCard.tsx`

- [ ] **Step 1: Create `LinkPreviewCard.tsx`**

```tsx
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface Props {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
}

export function LinkPreviewCard({ url, title, description, imageUrl }: Props) {
  if (!title && !description) return null

  let hostname = url
  try { hostname = new URL(url).hostname.replace('www.', '') } catch {}

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex overflow-hidden rounded-lg border border-[var(--color-border)] transition-colors hover:border-[var(--color-primary)]/40"
    >
      {imageUrl && (
        <div className="relative h-20 w-28 shrink-0">
          <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-3">
        {title && (
          <p className="line-clamp-1 text-sm font-semibold text-[var(--color-text)]">{title}</p>
        )}
        {description && (
          <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">{description}</p>
        )}
        <p className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <ExternalLink className="h-3 w-3" />
          {hostname}
        </p>
      </div>
    </a>
  )
}
```

- [ ] **Step 2: Wire `LinkPreviewCard` into `PostCard`**

Open `src/modules/forum/components/PostCard.tsx`. The component receives a `post` object. Add the preview card below the post content:

```tsx
import { LinkPreviewCard } from './LinkPreviewCard'

// At the bottom of PostCard, after the post content paragraph, add:
{post.linkPreviewUrl && post.linkPreviewData && (
  <LinkPreviewCard
    url={post.linkPreviewUrl}
    title={post.linkPreviewData.title}
    description={post.linkPreviewData.description}
    imageUrl={post.linkPreviewData.imageUrl}
  />
)}
```

However, `linkPreviewData` needs to be fetched. The cleanest approach: in `getThreadBySlug`, after fetching posts, batch-fetch all `ForumLinkPreview` rows for posts that have a `linkPreviewUrl`:

```ts
// In getThreadBySlug, after building postsWithScores:
const previewUrls = thread.posts
  .map(p => p.linkPreviewUrl)
  .filter((u): u is string => u !== null)

const previews = previewUrls.length > 0
  ? await db.forumLinkPreview.findMany({ where: { url: { in: previewUrls } } })
  : []

const previewMap = new Map(previews.map(p => [p.url, p]))

// Then attach to each post:
function attachPreviews<T extends { linkPreviewUrl?: string | null; replies?: T[] }>(posts: T[]) {
  return posts.map(p => ({
    ...p,
    linkPreviewData: p.linkPreviewUrl ? (previewMap.get(p.linkPreviewUrl) ?? null) : null,
    replies: p.replies ? attachPreviews(p.replies) : undefined,
  }))
}
```

- [ ] **Step 3: Smoke test link previews**

1. Create a thread with a URL in the body (e.g. `Check out https://singletracks.com`)
2. Submit and wait ~2 seconds
3. Reload the thread
4. Verify a preview card appears below the post content

- [ ] **Step 4: Final commit**

```bash
git add src/modules/forum/lib/link-preview.ts src/modules/forum/actions/createPost.ts src/modules/forum/actions/createThread.ts src/modules/forum/components/LinkPreviewCard.tsx src/modules/forum/components/PostCard.tsx src/modules/forum/lib/queries.ts
git commit -m "feat(forum): link preview — OG metadata fetch, 7-day cache, preview card in posts"
```

---

## Final Verification

- [ ] Run `npx tsc --noEmit` — expect zero errors
- [ ] Visit `/forum` — verify Hot/New/Top tabs work, Top shows time filter
- [ ] Create a thread with a URL — verify preview card appears
- [ ] Reply to a reply — verify nesting up to 3 levels
- [ ] Check notification bell — verify unread count appears after reply
- [ ] Visit `/forum/notifications` — verify notifications list
- [ ] Confirm migrated data shows in `/forum` feed
- [ ] Run `git log --oneline -10` to verify all commits landed
