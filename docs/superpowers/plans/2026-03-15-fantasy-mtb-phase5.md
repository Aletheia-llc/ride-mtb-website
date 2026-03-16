# Fantasy MTB Racing — Phase 5: Manufacturer Cup

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a season-long manufacturer pick that contributes to a separate Manufacturer Cup standings and adds bonus points to each round's regular fantasy score.

**Architecture:** Four new Prisma models (`BikeManufacturer`, `ManufacturerPick`, `ManufacturerEventScore`) plus a new `manufacturerId` FK on `Rider` and a `manufacturerPoints` column on `FantasyEventScore`. Manufacturer scoring runs inside the existing `resultsScore` worker — after all team scores are written, a second pass finds each user's `ManufacturerPick` for the series, resolves the top-finishing brand rider for that event, and upserts a `ManufacturerEventScore` + adds the manufacturer points to `FantasyEventScore.totalPoints`. The Manufacturer Cup leaderboard is a new tab on the existing leaderboard page, backed by a simple aggregate query on `ManufacturerEventScore`. The pre-season pick UI is a server-action-driven form card on the series hub page. Admin manages manufacturers via a new `/admin/fantasy/manufacturers` CRUD module and assigns them to riders on the existing rider edit form.

**Tech Stack:** Next.js 15.5.12, Prisma v7, PostgreSQL (Supabase), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-15-fantasy-mtb-design.md` — section: Manufacturer Cup

**Prerequisite:** Phase 4 plan complete (`docs/superpowers/plans/2026-03-15-fantasy-mtb-phase4.md`)

---

## File Structure

**Create:**
- `src/modules/fantasy/constants/scoring.ts` — add `MANUFACTURER_POSITION_POINTS` (modify existing file)
- `src/modules/fantasy/actions/pickManufacturer.ts` — server action: save/replace a user's manufacturer pick (pre-lock only)
- `src/modules/fantasy/queries/getManufacturerPick.ts` — query: fetch a user's current pick + season total for a series
- `src/modules/fantasy/queries/getManufacturerCupLeaderboard.ts` — query: aggregate leaderboard for Manufacturer Cup tab
- `src/ui/components/fantasy/ManufacturerPickCard.tsx` — pick UI card (series hub + team page)
- `src/ui/components/fantasy/ManufacturerCupTable.tsx` — leaderboard table component
- `src/app/admin/fantasy/manufacturers/page.tsx` — admin: list manufacturers
- `src/app/admin/fantasy/manufacturers/new/page.tsx` — admin: create manufacturer
- `src/app/admin/fantasy/manufacturers/[id]/page.tsx` — admin: edit manufacturer
- `src/app/admin/fantasy/manufacturers/ManufacturerForm.tsx` — shared form component
- `src/modules/fantasy/actions/admin/manageManufacturer.ts` — server actions: createManufacturer, updateManufacturer, deleteManufacturer

**Modify:**
- `prisma/schema.prisma` — add `BikeManufacturer`, `ManufacturerPick`, `ManufacturerEventScore` models; add `manufacturerId` to `Rider`; add `manufacturerPoints` to `FantasyEventScore`; add relation fields to `FantasySeries`, `FantasyEvent`, `User`
- `src/modules/fantasy/constants/scoring.ts` — add `MANUFACTURER_POSITION_POINTS`
- `src/modules/fantasy/worker/resultsScore.ts` — after team scoring step, add manufacturer scoring pass
- `src/app/fantasy/[series]/leaderboard/page.tsx` — add Manufacturer Cup tab
- `src/app/fantasy/[series]/page.tsx` — add ManufacturerPickCard
- `src/app/fantasy/[series]/team/page.tsx` — add manufacturer pick badge in team panel
- `src/app/admin/fantasy/riders/RiderForm.tsx` — add manufacturer dropdown field
- `src/modules/fantasy/actions/admin/manageRider.ts` — handle `manufacturerId` in create/update actions

---

## Chunk 1: Schema + Constants

### Task 1: Prisma schema additions + db push

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/modules/fantasy/constants/scoring.ts`

- [ ] **Step 1: Add `BikeManufacturer` model and `manufacturerId` FK on `Rider`**

In `prisma/schema.prisma`, after the `model Rider { ... }` block, add:

```prisma
model BikeManufacturer {
  id       String  @id @default(cuid())
  name     String
  slug     String  @unique
  logoUrl  String?
  riders   Rider[]
  picks    ManufacturerPick[]
  scores   ManufacturerEventScore[]

  @@map("bike_manufacturers")
}
```

In `model Rider`, add two lines after `createdAt DateTime @default(now())`:

```prisma
  manufacturerId String?
  manufacturer   BikeManufacturer? @relation(fields: [manufacturerId], references: [id], onDelete: SetNull)
```

- [ ] **Step 2: Add `ManufacturerPick` and `ManufacturerEventScore` models**

After `BikeManufacturer`, add:

```prisma
model ManufacturerPick {
  id             String           @id @default(cuid())
  userId         String
  seriesId       String
  season         Int
  manufacturerId String
  lockedAt       DateTime?
  createdAt      DateTime         @default(now())
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  series         FantasySeries    @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  manufacturer   BikeManufacturer @relation(fields: [manufacturerId], references: [id], onDelete: Cascade)
  eventScores    ManufacturerEventScore[]

  @@unique([userId, seriesId, season])
  @@map("manufacturer_picks")
}

model ManufacturerEventScore {
  id                  String           @id @default(cuid())
  userId              String
  seriesId            String
  season              Int
  eventId             String
  manufacturerPickId  String
  points              Int
  riderId             String
  riderFinishPosition Int
  user                User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  series              FantasySeries    @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  event               FantasyEvent     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  manufacturerPick    ManufacturerPick @relation(fields: [manufacturerPickId], references: [id], onDelete: Cascade)
  rider               Rider            @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([userId, seriesId, season, eventId])
  @@index([seriesId, season, userId])
  @@map("manufacturer_event_scores")
}
```

- [ ] **Step 3: Add `manufacturerPoints` to `FantasyEventScore`**

In `model FantasyEventScore`, add after `isOverBudget Boolean @default(false)`:

```prisma
  manufacturerPoints Int @default(0)
```

- [ ] **Step 4: Add relation fields to `FantasySeries`, `FantasyEvent`, `User`**

In `model FantasySeries`, add:
```prisma
  manufacturerPicks  ManufacturerPick[]
  manufacturerScores ManufacturerEventScore[]
```

In `model FantasyEvent`, add:
```prisma
  manufacturerScores ManufacturerEventScore[]
```

In `model User` (in `prisma/schema.prisma`), add:
```prisma
  manufacturerPicks  ManufacturerPick[]
  manufacturerScores ManufacturerEventScore[]
```

- [ ] **Step 5: Run db push**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma db push
```

Expected output: Prisma reports new tables `bike_manufacturers`, `manufacturer_picks`, `manufacturer_event_scores`, new column `riders.manufacturer_id`, new column `fantasy_event_scores.manufacturer_points`. Prisma client regenerated.

- [ ] **Step 6: Add `MANUFACTURER_POSITION_POINTS` to scoring constants**

In `src/modules/fantasy/constants/scoring.ts`, append after the existing constants:

```typescript
// Half-table: POSITION_POINTS × 0.5, rounded to nearest integer. No negative for DNS/DNF.
export const MANUFACTURER_POSITION_POINTS: Record<number, number> = {
  1: 15, 2: 14, 3: 13, 4: 12, 5: 11,
  6: 10, 7: 9,  8: 8,  9: 7,  10: 6,
  11: 5, 12: 5, 13: 4, 14: 4, 15: 3,
  16: 3, 17: 2, 18: 2, 19: 1, 20: 1,
}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add prisma/schema.prisma src/modules/fantasy/constants/scoring.ts
git commit -m "feat(fantasy/mfr-cup): schema — BikeManufacturer, ManufacturerPick, ManufacturerEventScore, MANUFACTURER_POSITION_POINTS"
```

---

## Chunk 2: Admin — Manufacturer CRUD + Rider Assignment

### Task 2: Admin manufacturer management pages + server actions

**Files:**
- Create: `src/modules/fantasy/actions/admin/manageManufacturer.ts`
- Create: `src/app/admin/fantasy/manufacturers/ManufacturerForm.tsx`
- Create: `src/app/admin/fantasy/manufacturers/page.tsx`
- Create: `src/app/admin/fantasy/manufacturers/new/page.tsx`
- Create: `src/app/admin/fantasy/manufacturers/[id]/page.tsx`

- [ ] **Step 1: Write test for `createManufacturer` action**

Create `src/modules/fantasy/__tests__/manageManufacturer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db
vi.mock('@/lib/db/client', () => ({
  db: {
    bikeManufacturer: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { db } from '@/lib/db/client'

describe('createManufacturer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns name error for empty name', async () => {
    const { createManufacturer } = await import('../actions/admin/manageManufacturer')
    const fd = new FormData()
    fd.set('name', '')
    fd.set('slug', 'trek')
    const result = await createManufacturer({ errors: {} }, fd)
    expect(result.errors?.name).toBeTruthy()
  })

  it('returns slug error for empty slug', async () => {
    const { createManufacturer } = await import('../actions/admin/manageManufacturer')
    const fd = new FormData()
    fd.set('name', 'Trek')
    fd.set('slug', '')
    const result = await createManufacturer({ errors: {} }, fd)
    expect(result.errors?.slug).toBeTruthy()
  })

  it('calls db.bikeManufacturer.create with correct data', async () => {
    vi.mocked(db.bikeManufacturer.create).mockResolvedValue({ id: 'mfr_1', name: 'Trek', slug: 'trek', logoUrl: null } as any)
    const { createManufacturer } = await import('../actions/admin/manageManufacturer')
    const fd = new FormData()
    fd.set('name', 'Trek')
    fd.set('slug', 'trek')
    await createManufacturer({ errors: {} }, fd)
    expect(db.bikeManufacturer.create).toHaveBeenCalledWith({
      data: { name: 'Trek', slug: 'trek', logoUrl: undefined },
    })
  })
})
```

Run (expect fail):
```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy/__tests__/manageManufacturer.test.ts
```

- [ ] **Step 2: Create `src/modules/fantasy/actions/admin/manageManufacturer.ts`**

```typescript
'use server'

import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ManufacturerFormState = {
  errors?: {
    general?: string
    name?: string
    slug?: string
    logoUrl?: string
  }
}

export async function createManufacturer(
  _prev: ManufacturerFormState,
  formData: FormData
): Promise<ManufacturerFormState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''
  const logoUrl = (formData.get('logoUrl') as string | null)?.trim() || undefined

  const errors: ManufacturerFormState['errors'] = {}
  if (!name) errors.name = 'Name is required'
  if (!slug) errors.slug = 'Slug is required'
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only'
  if (logoUrl && !logoUrl.startsWith('http')) errors.logoUrl = 'Logo URL must be a valid URL'
  if (Object.keys(errors).length > 0) return { errors }

  try {
    await db.bikeManufacturer.create({ data: { name, slug, logoUrl } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return { errors: { slug: 'A manufacturer with this slug already exists' } }
    }
    return { errors: { general: 'Failed to create manufacturer' } }
  }

  revalidatePath('/admin/fantasy/manufacturers')
  redirect('/admin/fantasy/manufacturers')
}

export async function updateManufacturer(
  _prev: ManufacturerFormState,
  formData: FormData
): Promise<ManufacturerFormState> {
  const id = formData.get('id') as string
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''
  const logoUrl = (formData.get('logoUrl') as string | null)?.trim() || undefined

  const errors: ManufacturerFormState['errors'] = {}
  if (!name) errors.name = 'Name is required'
  if (!slug) errors.slug = 'Slug is required'
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only'
  if (logoUrl && !logoUrl.startsWith('http')) errors.logoUrl = 'Logo URL must be a valid URL'
  if (Object.keys(errors).length > 0) return { errors }

  try {
    await db.bikeManufacturer.update({ where: { id }, data: { name, slug, logoUrl: logoUrl ?? null } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return { errors: { slug: 'A manufacturer with this slug already exists' } }
    }
    return { errors: { general: 'Failed to update manufacturer' } }
  }

  revalidatePath('/admin/fantasy/manufacturers')
  redirect('/admin/fantasy/manufacturers')
}

export async function deleteManufacturer(id: string): Promise<void> {
  await db.bikeManufacturer.delete({ where: { id } })
  revalidatePath('/admin/fantasy/manufacturers')
}
```

- [ ] **Step 3: Run tests (expect pass)**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy/__tests__/manageManufacturer.test.ts
```

Expected: 3/3 pass.

- [ ] **Step 4: Create `src/app/admin/fantasy/manufacturers/ManufacturerForm.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createManufacturer, updateManufacturer } from '@/modules/fantasy/actions/admin/manageManufacturer'
import type { ManufacturerFormState } from '@/modules/fantasy/actions/admin/manageManufacturer'
import type { BikeManufacturer } from '@/generated/prisma/client'
import { Card } from '@/ui/components'

interface ManufacturerFormProps {
  manufacturer?: BikeManufacturer
}

export function ManufacturerForm({ manufacturer }: ManufacturerFormProps) {
  const isNew = !manufacturer
  const [state, formAction, pending] = useActionState<ManufacturerFormState, FormData>(
    isNew ? createManufacturer : updateManufacturer,
    { errors: {} }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fantasy/manufacturers"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft className="h-4 w-4" />
          Back to Manufacturers
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {isNew ? 'New Manufacturer' : `Edit ${manufacturer?.name}`}
        </h1>
      </div>

      <Card className="p-6">
        <form action={formAction} className="space-y-6">
          {manufacturer?.id && <input type="hidden" name="id" value={manufacturer.id} />}

          {state.errors?.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.errors.general}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={manufacturer?.name ?? ''}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.name
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                placeholder="e.g. Trek"
              />
              {state.errors?.name && <p className="mt-1 text-xs text-red-600">{state.errors.name}</p>}
            </div>

            <div>
              <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                defaultValue={manufacturer?.slug ?? ''}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.slug
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                placeholder="e.g. trek"
              />
              {state.errors?.slug && <p className="mt-1 text-xs text-red-600">{state.errors.slug}</p>}
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Lowercase letters, numbers, hyphens only</p>
            </div>
          </div>

          <div>
            <label htmlFor="logoUrl" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Logo URL <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={manufacturer?.logoUrl ?? ''}
              className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                state.errors?.logoUrl
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
              }`}
              placeholder="https://..."
            />
            {state.errors?.logoUrl && <p className="mt-1 text-xs text-red-600">{state.errors.logoUrl}</p>}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--color-primary)] px-6 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {pending ? 'Saving...' : isNew ? 'Create Manufacturer' : 'Save Changes'}
            </button>
            <Link href="/admin/fantasy/manufacturers"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/app/admin/fantasy/manufacturers/page.tsx`**

```tsx
import { db } from '@/lib/db/client'
import Link from 'next/link'
import { deleteManufacturer } from '@/modules/fantasy/actions/admin/manageManufacturer'
import Image from 'next/image'

export default async function AdminManufacturersPage() {
  const manufacturers = await db.bikeManufacturer.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { riders: true } } },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bike Manufacturers ({manufacturers.length})</h1>
        <Link href="/admin/fantasy/manufacturers/new"
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition">
          + New Manufacturer
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            <th className="py-2 pr-4">Logo</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Slug</th>
            <th className="py-2 pr-4">Riders</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {manufacturers.map(m => (
            <tr key={m.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">
              <td className="py-2 pr-4">
                {m.logoUrl
                  ? <Image src={m.logoUrl} alt={m.name} width={32} height={32} className="rounded" />
                  : <span className="text-[var(--color-text-muted)] text-xs">—</span>
                }
              </td>
              <td className="py-2 pr-4 font-medium">{m.name}</td>
              <td className="py-2 pr-4 font-mono text-xs text-[var(--color-text-muted)]">{m.slug}</td>
              <td className="py-2 pr-4">{m._count.riders}</td>
              <td className="py-2 flex gap-3">
                <Link href={`/admin/fantasy/manufacturers/${m.id}`}
                  className="text-blue-600 hover:underline text-sm">Edit</Link>
                <form action={async () => {
                  'use server'
                  await deleteManufacturer(m.id)
                }}>
                  <button type="submit"
                    className="text-red-500 hover:underline text-sm"
                    onClick={(e) => {
                      if (!confirm(`Delete ${m.name}? This will unassign all riders.`)) e.preventDefault()
                    }}>
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/app/admin/fantasy/manufacturers/new/page.tsx`**

```tsx
import { ManufacturerForm } from '../ManufacturerForm'

export default function NewManufacturerPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ManufacturerForm />
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/admin/fantasy/manufacturers/[id]/page.tsx`**

```tsx
import { db } from '@/lib/db/client'
import { ManufacturerForm } from '../ManufacturerForm'
import { notFound } from 'next/navigation'

export default async function EditManufacturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const manufacturer = await db.bikeManufacturer.findUnique({ where: { id } })
  if (!manufacturer) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ManufacturerForm manufacturer={manufacturer} />
    </div>
  )
}
```

- [ ] **Step 8: Add manufacturer nav link to admin fantasy layout**

In `src/app/admin/fantasy/page.tsx` (or the admin fantasy layout), add a "Manufacturers" link alongside the existing Series / Events / Riders links. Exact nav list item to add:

```tsx
<Link href="/admin/fantasy/manufacturers">Manufacturers</Link>
```

- [ ] **Step 9: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add \
  src/modules/fantasy/actions/admin/manageManufacturer.ts \
  src/modules/fantasy/__tests__/manageManufacturer.test.ts \
  "src/app/admin/fantasy/manufacturers/ManufacturerForm.tsx" \
  "src/app/admin/fantasy/manufacturers/page.tsx" \
  "src/app/admin/fantasy/manufacturers/new/page.tsx" \
  "src/app/admin/fantasy/manufacturers/[id]/page.tsx"
git commit -m "feat(fantasy/mfr-cup): admin manufacturer CRUD pages + server actions"
```

---

### Task 3: Assign manufacturers to riders (rider edit form + action)

**Files:**
- Modify: `src/app/admin/fantasy/riders/RiderForm.tsx`
- Modify: `src/modules/fantasy/actions/admin/manageRider.ts`

- [ ] **Step 1: Read current `manageRider.ts` to understand existing create/update signatures**

```bash
cat /Users/kylewarner/Documents/ride-mtb/src/modules/fantasy/actions/admin/manageRider.ts
```

- [ ] **Step 2: Add `manufacturerId` handling to `createRider` and `updateRider`**

In `src/modules/fantasy/actions/admin/manageRider.ts`, in both `createRider` and `updateRider`:

1. Extract `manufacturerId` from FormData: `const manufacturerId = (formData.get('manufacturerId') as string | null) || null`
2. Pass `manufacturerId` to the Prisma `create`/`update` call's `data` object.

For `createRider`, inside `data: { ... }`, add: `manufacturerId: manufacturerId ?? undefined`
For `updateRider`, inside `data: { ... }`, add: `manufacturerId: manufacturerId`

- [ ] **Step 3: Add manufacturer dropdown to `RiderForm.tsx`**

In `RiderForm.tsx`, the component needs access to all manufacturers for the dropdown. Update the `RiderFormProps` interface and the page that renders it to pass manufacturers:

First, update `RiderFormProps`:

```typescript
interface RiderFormProps {
  rider?: Rider & { manufacturerId?: string | null }
  manufacturers: { id: string; name: string }[]
}
```

Add the manufacturer dropdown field in the form, after the Photo URL field and before the Buttons section:

```tsx
{/* Manufacturer */}
<div>
  <label htmlFor="manufacturerId" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
    Manufacturer <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
  </label>
  <select
    id="manufacturerId"
    name="manufacturerId"
    defaultValue={rider?.manufacturerId ?? ''}
    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
  >
    <option value="">— None —</option>
    {manufacturers.map(m => (
      <option key={m.id} value={m.id}>{m.name}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 4: Pass manufacturers to `RiderForm` from both rider pages**

In `src/app/admin/fantasy/riders/new/page.tsx` and `src/app/admin/fantasy/riders/[id]/page.tsx`, fetch manufacturers and pass to `RiderForm`:

```typescript
const manufacturers = await db.bikeManufacturer.findMany({
  select: { id: true, name: true },
  orderBy: { name: 'asc' },
})
// Pass as prop: <RiderForm manufacturers={manufacturers} />
// For edit page: <RiderForm rider={rider} manufacturers={manufacturers} />
```

- [ ] **Step 5: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add \
  "src/app/admin/fantasy/riders/RiderForm.tsx" \
  "src/modules/fantasy/actions/admin/manageRider.ts" \
  "src/app/admin/fantasy/riders/new/page.tsx" \
  "src/app/admin/fantasy/riders/[id]/page.tsx"
git commit -m "feat(fantasy/mfr-cup): add manufacturer assignment to rider edit form"
```

---

## Chunk 3: Manufacturer Pick UI

### Task 4: Server action + queries for manufacturer pick

**Files:**
- Create: `src/modules/fantasy/actions/pickManufacturer.ts`
- Create: `src/modules/fantasy/queries/getManufacturerPick.ts`

- [ ] **Step 1: Write test for `pickManufacturer` action**

Create `src/modules/fantasy/__tests__/pickManufacturer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user_1' } }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    fantasyEvent: {
      findFirst: vi.fn(),
    },
    manufacturerPick: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'

describe('pickManufacturer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error if pick window is closed (Round 1 locked)', async () => {
    vi.mocked(db.fantasyEvent.findFirst).mockResolvedValue({
      rosterDeadline: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    } as any)
    vi.mocked(db.manufacturerPick.findUnique).mockResolvedValue(null)

    const { pickManufacturer } = await import('../actions/pickManufacturer')
    const fd = new FormData()
    fd.set('seriesId', 'series_1')
    fd.set('season', '2026')
    fd.set('manufacturerId', 'mfr_1')
    const result = await pickManufacturer({ error: undefined }, fd)
    expect(result.error).toMatch(/closed/i)
  })

  it('upserts pick when window is open', async () => {
    vi.mocked(db.fantasyEvent.findFirst).mockResolvedValue({
      rosterDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h from now
    } as any)
    vi.mocked(db.manufacturerPick.upsert).mockResolvedValue({} as any)
    vi.mocked(db.manufacturerPick.findUnique).mockResolvedValue(null)

    const { pickManufacturer } = await import('../actions/pickManufacturer')
    const fd = new FormData()
    fd.set('seriesId', 'series_1')
    fd.set('season', '2026')
    fd.set('manufacturerId', 'mfr_1')
    const result = await pickManufacturer({ error: undefined }, fd)
    expect(result.error).toBeUndefined()
    expect(db.manufacturerPick.upsert).toHaveBeenCalled()
  })

  it('returns error if already locked', async () => {
    vi.mocked(db.fantasyEvent.findFirst).mockResolvedValue({
      rosterDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24),
    } as any)
    vi.mocked(db.manufacturerPick.findUnique).mockResolvedValue({
      lockedAt: new Date(Date.now() - 1000),
    } as any)

    const { pickManufacturer } = await import('../actions/pickManufacturer')
    const fd = new FormData()
    fd.set('seriesId', 'series_1')
    fd.set('season', '2026')
    fd.set('manufacturerId', 'mfr_1')
    const result = await pickManufacturer({ error: undefined }, fd)
    expect(result.error).toMatch(/locked/i)
  })
})
```

Run (expect fail):
```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy/__tests__/pickManufacturer.test.ts
```

- [ ] **Step 2: Create `src/modules/fantasy/actions/pickManufacturer.ts`**

```typescript
'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

export type PickManufacturerState = { error?: string }

export async function pickManufacturer(
  _prev: PickManufacturerState,
  formData: FormData
): Promise<PickManufacturerState> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const userId = session.user.id

  const seriesId = formData.get('seriesId') as string
  const season = Number(formData.get('season'))
  const manufacturerId = formData.get('manufacturerId') as string

  if (!seriesId || !season || !manufacturerId) return { error: 'Missing required fields' }

  // Check if pick is already locked for this user/series/season
  const existingPick = await db.manufacturerPick.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    select: { lockedAt: true },
  })
  if (existingPick?.lockedAt) {
    return { error: 'Your manufacturer pick is locked for this season — no changes allowed after Round 1.' }
  }

  // Check pick window: open until Round 1 rosterDeadline
  const round1 = await db.fantasyEvent.findFirst({
    where: { seriesId },
    orderBy: { raceDate: 'asc' },
    select: { rosterDeadline: true },
  })
  if (round1 && round1.rosterDeadline < new Date()) {
    return { error: 'The manufacturer pick window is closed. Picks lock at the Round 1 roster deadline.' }
  }

  await db.manufacturerPick.upsert({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    create: { userId, seriesId, season, manufacturerId },
    update: { manufacturerId },
  })

  revalidatePath(`/fantasy`)
  return {}
}
```

- [ ] **Step 3: Run tests (expect pass)**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy/__tests__/pickManufacturer.test.ts
```

Expected: 3/3 pass.

- [ ] **Step 4: Create `src/modules/fantasy/queries/getManufacturerPick.ts`**

```typescript
import { db } from '@/lib/db/client'
import { pool } from '@/lib/db/client'

export async function getManufacturerPick(userId: string, seriesId: string, season: number) {
  const pick = await db.manufacturerPick.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    include: { manufacturer: { select: { id: true, name: true, slug: true, logoUrl: true } } },
  })
  if (!pick) return null

  // Get season total manufacturer points for this user
  const totalsRes = await pool.query(
    `SELECT COALESCE(SUM(points), 0) AS total
     FROM manufacturer_event_scores
     WHERE "userId" = $1 AND "seriesId" = $2 AND season = $3`,
    [userId, seriesId, season]
  )
  const seasonTotal = Number(totalsRes.rows[0]?.total ?? 0)

  return { ...pick, seasonTotal }
}

export type ManufacturerPickWithTotal = NonNullable<Awaited<ReturnType<typeof getManufacturerPick>>>
```

- [ ] **Step 5: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add \
  src/modules/fantasy/actions/pickManufacturer.ts \
  src/modules/fantasy/__tests__/pickManufacturer.test.ts \
  src/modules/fantasy/queries/getManufacturerPick.ts
git commit -m "feat(fantasy/mfr-cup): pickManufacturer action + getManufacturerPick query"
```

---

### Task 5: ManufacturerPickCard UI component

**Files:**
- Create: `src/ui/components/fantasy/ManufacturerPickCard.tsx`

- [ ] **Step 1: Create `src/ui/components/fantasy/ManufacturerPickCard.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { pickManufacturer } from '@/modules/fantasy/actions/pickManufacturer'
import type { PickManufacturerState } from '@/modules/fantasy/actions/pickManufacturer'
import type { ManufacturerPickWithTotal } from '@/modules/fantasy/queries/getManufacturerPick'
import Image from 'next/image'

interface Props {
  seriesId: string
  season: number
  currentPick: ManufacturerPickWithTotal | null
  manufacturers: { id: string; name: string; slug: string; logoUrl: string | null }[]
  /** true if Round 1 rosterDeadline has passed */
  pickWindowClosed: boolean
}

export function ManufacturerPickCard({ seriesId, season, currentPick, manufacturers, pickWindowClosed }: Props) {
  const [state, formAction, pending] = useActionState<PickManufacturerState, FormData>(
    pickManufacturer,
    {}
  )

  const isLocked = currentPick?.lockedAt != null || pickWindowClosed

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Manufacturer Cup Pick</h2>
        {isLocked && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Locked</span>
        )}
        {!isLocked && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Open</span>
        )}
      </div>

      {currentPick ? (
        <div className="flex items-center gap-3">
          {currentPick.manufacturer.logoUrl && (
            <Image
              src={currentPick.manufacturer.logoUrl}
              alt={currentPick.manufacturer.name}
              width={32}
              height={32}
              className="rounded"
            />
          )}
          <div>
            <p className="font-medium">{currentPick.manufacturer.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {currentPick.seasonTotal} pts this season
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">No manufacturer selected yet.</p>
      )}

      {!isLocked && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="seriesId" value={seriesId} />
          <input type="hidden" name="season" value={season} />
          <div className="flex gap-2">
            <select
              name="manufacturerId"
              defaultValue={currentPick?.manufacturerId ?? ''}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">— Choose a manufacturer —</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition"
            >
              {pending ? 'Saving...' : currentPick ? 'Change' : 'Pick'}
            </button>
          </div>
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">
            Locks at the Round 1 roster deadline. No mid-season changes.
          </p>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `ManufacturerPickCard` to series hub page**

In `src/app/fantasy/[series]/page.tsx`:

1. Import `ManufacturerPickCard` and the queries.
2. Fetch `session`, `currentPick`, `manufacturers`, and check `pickWindowClosed`.
3. Render `<ManufacturerPickCard>` above the events list.

Updated page (full replacement to integrate):

```tsx
import { auth } from '@/lib/auth'
import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { getManufacturerPick } from '@/modules/fantasy/queries/getManufacturerPick'
import { db } from '@/lib/db/client'
import { ManufacturerPickCard } from '@/ui/components/fantasy/ManufacturerPickCard'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function SeriesHubPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  const session = await auth()
  const userId = session?.user?.id

  // Manufacturer Cup: pick + window status
  const manufacturers = await db.bikeManufacturer.findMany({
    select: { id: true, name: true, slug: true, logoUrl: true },
    orderBy: { name: 'asc' },
  })
  const currentPick = userId
    ? await getManufacturerPick(userId, seriesData.id, seriesData.season)
    : null
  const round1 = seriesData.events.find(e => e.status !== 'upcoming') ?? seriesData.events[0]
  const pickWindowClosed = round1 ? new Date(round1.rosterDeadline) < new Date() : false

  return (
    <div className="py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] uppercase font-semibold">{seriesData.discipline.toUpperCase()}</p>
          <h1 className="text-2xl font-extrabold">{seriesData.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/fantasy/${series}/leaderboard`}
            className="border border-[var(--color-border)] rounded px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)]">
            Leaderboard
          </Link>
          <Link href={`/fantasy/${series}/riders`}
            className="border border-[var(--color-border)] rounded px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)]">
            Riders
          </Link>
        </div>
      </div>

      {userId && (
        <ManufacturerPickCard
          seriesId={seriesData.id}
          season={seriesData.season}
          currentPick={currentPick}
          manufacturers={manufacturers}
          pickWindowClosed={pickWindowClosed}
        />
      )}

      <div className="space-y-3">
        <h2 className="font-semibold">Events</h2>
        {seriesData.events.map(event => {
          const isOpen = event.status === 'roster_open'
          return (
            <div key={event.id} className="border border-[var(--color-border)] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {event.location} · {new Date(event.raceDate).toLocaleDateString()}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isOpen ? 'bg-green-100 text-green-700' :
                  event.status === 'scored' ? 'bg-gray-100 text-gray-600' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{event.status.replace('_', ' ')}</span>
              </div>
              {isOpen && (
                <Link href={`/fantasy/${series}/team`}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Build Team
                </Link>
              )}
              {event.status === 'scored' && (
                <Link href={`/fantasy/${series}/team/${event.id}`}
                  className="border border-[var(--color-border)] px-3 py-1.5 rounded text-sm">
                  View Results
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Note: `getSeriesHub` query must also include `rosterDeadline` on event rows. If it does not, update `getSeriesHub.ts` to add `rosterDeadline` to the event select.

- [ ] **Step 3: Add manufacturer badge to team selection page**

In `src/app/fantasy/[series]/team/page.tsx`, after fetching the session and series data, fetch and render a compact manufacturer badge. Add above the team panels:

```tsx
// In the server component:
const manufacturerPick = userId ? await getManufacturerPick(userId, seriesData.id, seriesData.season) : null
```

Then in JSX, at the top of the layout:
```tsx
{manufacturerPick && (
  <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg px-3 py-2">
    {manufacturerPick.manufacturer.logoUrl && (
      <Image src={manufacturerPick.manufacturer.logoUrl} alt="" width={20} height={20} className="rounded" />
    )}
    <span>
      <span className="font-medium text-[var(--color-text)]">{manufacturerPick.manufacturer.name}</span>
      {' '}· Manufacturer Cup · {manufacturerPick.seasonTotal} pts
    </span>
  </div>
)}
```

- [ ] **Step 4: Lock picks at Round 1 roster deadline**

In `src/app/api/cron/fantasy/lock-rosters/route.ts`, after the existing lock batch (setting `FantasyPick.lockedAt`), check if the event being locked is Round 1 for its series and lock all `ManufacturerPick` rows for that series+season:

```typescript
// After locking FantasyPick rows for the event...
// Check if this is Round 1 (earliest event in series)
const round1Check = await pool.query(
  `SELECT id FROM fantasy_events
   WHERE "seriesId" = $1
   ORDER BY "raceDate" ASC
   LIMIT 1`,
  [event.seriesId]
)
if (round1Check.rows[0]?.id === event.id) {
  // Lock all open manufacturer picks for this series+season
  await pool.query(
    `UPDATE manufacturer_picks
     SET "lockedAt" = NOW()
     WHERE "seriesId" = $1 AND season = $2 AND "lockedAt" IS NULL`,
    [event.seriesId, event.season]
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add \
  "src/ui/components/fantasy/ManufacturerPickCard.tsx" \
  "src/app/fantasy/[series]/page.tsx" \
  "src/app/fantasy/[series]/team/page.tsx" \
  "src/app/api/cron/fantasy/lock-rosters/route.ts"
git commit -m "feat(fantasy/mfr-cup): ManufacturerPickCard UI + series hub + team page badge + lock-rosters hook"
```

---

## Chunk 4: Manufacturer Scoring in resultsScore Worker

### Task 6: Add manufacturer scoring pass to resultsScore worker

**Files:**
- Modify: `src/modules/fantasy/worker/resultsScore.ts`

- [ ] **Step 1: Write test for manufacturer scoring logic**

Create `src/modules/fantasy/__tests__/manufacturerScoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { MANUFACTURER_POSITION_POINTS } from '../constants/scoring'

describe('MANUFACTURER_POSITION_POINTS', () => {
  it('1st place = 15', () => expect(MANUFACTURER_POSITION_POINTS[1]).toBe(15))
  it('2nd place = 14', () => expect(MANUFACTURER_POSITION_POINTS[2]).toBe(14))
  it('12th place = 5 (rounds up from 4.5)', () => expect(MANUFACTURER_POSITION_POINTS[12]).toBe(5))
  it('14th place = 4 (rounds up from 3.5)', () => expect(MANUFACTURER_POSITION_POINTS[14]).toBe(4))
  it('20th place = 1 (rounds up from 0.5)', () => expect(MANUFACTURER_POSITION_POINTS[20]).toBe(1))
  it('returns undefined for 21st+ (caller treats as 0)', () => expect(MANUFACTURER_POSITION_POINTS[21]).toBeUndefined())
})

describe('manufacturer top-finisher selection', () => {
  // Pure function extracted for testability
  function getTopBrandFinisher(
    entries: Array<{ riderId: string; finishPosition: number | null; dnsDnf: boolean; partialCompletion: boolean; manufacturerId: string | null }>,
    manufacturerId: string
  ): { riderId: string; finishPosition: number } | null {
    const eligible = entries.filter(
      e => e.manufacturerId === manufacturerId && !e.dnsDnf && !e.partialCompletion && e.finishPosition !== null
    ) as Array<{ riderId: string; finishPosition: number; manufacturerId: string; dnsDnf: boolean; partialCompletion: boolean }>
    if (eligible.length === 0) return null
    eligible.sort((a, b) => a.finishPosition - b.finishPosition)
    return { riderId: eligible[0].riderId, finishPosition: eligible[0].finishPosition }
  }

  it('picks lowest finishPosition', () => {
    const entries = [
      { riderId: 'r1', finishPosition: 3, dnsDnf: false, partialCompletion: false, manufacturerId: 'mfr_1' },
      { riderId: 'r2', finishPosition: 1, dnsDnf: false, partialCompletion: false, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toEqual({ riderId: 'r2', finishPosition: 1 })
  })

  it('excludes DNS/DNF riders', () => {
    const entries = [
      { riderId: 'r1', finishPosition: null, dnsDnf: true, partialCompletion: false, manufacturerId: 'mfr_1' },
      { riderId: 'r2', finishPosition: 5, dnsDnf: false, partialCompletion: false, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toEqual({ riderId: 'r2', finishPosition: 5 })
  })

  it('excludes EWS partial completion riders', () => {
    const entries = [
      { riderId: 'r1', finishPosition: null, dnsDnf: false, partialCompletion: true, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toBeNull()
  })

  it('returns null when all brand riders DNS/DNF', () => {
    const entries = [
      { riderId: 'r1', finishPosition: null, dnsDnf: true, partialCompletion: false, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toBeNull()
  })

  it('returns null when no riders for brand in event', () => {
    expect(getTopBrandFinisher([], 'mfr_1')).toBeNull()
  })
})
```

Run (expect partial pass — constants test passes, scoring logic undefined until helper is created):
```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy/__tests__/manufacturerScoring.test.ts
```

- [ ] **Step 2: Modify `src/modules/fantasy/worker/resultsScore.ts`**

After step 7 (assign season ranks) and before step 8 (grant XP), insert the manufacturer scoring pass. The full addition:

```typescript
// 7.5 — Manufacturer Cup scoring pass
// For each active ManufacturerPick for this series+season, find the top-finishing
// brand rider for this event, compute half-table points, upsert ManufacturerEventScore,
// and add manufacturerPoints to the user's FantasyEventScore.

const mfrPicks = await client.query(
  `SELECT mp.id AS "manufacturerPickId", mp."userId", mp."manufacturerId"
   FROM manufacturer_picks mp
   WHERE mp."seriesId" = $1 AND mp.season = $2
     AND mp."lockedAt" IS NOT NULL`,
  [seriesId, season]
)

// Load all rider event entries with manufacturer info for this event
const mfrRiderEntries = await client.query(
  `SELECT ree."riderId", ree."finishPosition", ree."dnsDnf", ree."partialCompletion",
          r."manufacturerId"
   FROM rider_event_entries ree
   JOIN riders r ON r.id = ree."riderId"
   WHERE ree."eventId" = $1`,
  [eventId]
)

for (const pick of mfrPicks.rows) {
  const { manufacturerPickId, userId, manufacturerId } = pick

  // Find top finisher for this brand
  const eligible = mfrRiderEntries.rows.filter(
    (e: { manufacturerId: string | null; dnsDnf: boolean; partialCompletion: boolean; finishPosition: number | null }) =>
      e.manufacturerId === manufacturerId &&
      !e.dnsDnf &&
      !e.partialCompletion &&
      e.finishPosition !== null
  ).sort((a: { finishPosition: number }, b: { finishPosition: number }) => a.finishPosition - b.finishPosition)

  if (eligible.length === 0) {
    // No eligible riders — upsert 0-point score record as placeholder (visible in UI as "0 pts")
    // We still need a teamId for FantasyEventScore update; skip if no team exists
    continue
  }

  const topRider = eligible[0] as { riderId: string; finishPosition: number }
  const mfrPoints = MANUFACTURER_POSITION_POINTS[topRider.finishPosition] ?? 0

  // Upsert ManufacturerEventScore
  await client.query(
    `INSERT INTO manufacturer_event_scores
       (id, "userId", "seriesId", season, "eventId", "manufacturerPickId", points, "riderId", "riderFinishPosition")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT ("userId", "seriesId", season, "eventId") DO UPDATE SET
       points = EXCLUDED.points,
       "riderId" = EXCLUDED."riderId",
       "riderFinishPosition" = EXCLUDED."riderFinishPosition",
       "manufacturerPickId" = EXCLUDED."manufacturerPickId"`,
    [userId, seriesId, season, eventId, manufacturerPickId, mfrPoints, topRider.riderId, topRider.finishPosition]
  )

  if (mfrPoints === 0) continue

  // Add manufacturer points to the user's FantasyEventScore for this event
  await client.query(
    `UPDATE fantasy_event_scores fes
     SET
       "manufacturerPoints" = $1,
       "totalPoints" = "totalPoints" + $1
     FROM fantasy_teams ft
     WHERE ft.id = fes."teamId"
       AND ft."userId" = $2
       AND fes."eventId" = $3`,
    [mfrPoints, userId, eventId]
  )
}
```

Also add the import at the top of the file:
```typescript
import { getBasePoints, getBonusPoints, computeTeamTotal } from '../lib/scoring'
import { MANUFACTURER_POSITION_POINTS } from '../constants/scoring'
```

(The `MANUFACTURER_POSITION_POINTS` import line is new — add it to the existing import.)

- [ ] **Step 3: Re-run tests (expect pass)**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy/__tests__/manufacturerScoring.test.ts
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add \
  src/modules/fantasy/worker/resultsScore.ts \
  src/modules/fantasy/__tests__/manufacturerScoring.test.ts
git commit -m "feat(fantasy/mfr-cup): manufacturer scoring pass in resultsScore worker"
```

---

## Chunk 5: Manufacturer Cup Leaderboard Tab

### Task 7: Manufacturer Cup leaderboard query + UI

**Files:**
- Create: `src/modules/fantasy/queries/getManufacturerCupLeaderboard.ts`
- Create: `src/ui/components/fantasy/ManufacturerCupTable.tsx`
- Modify: `src/app/fantasy/[series]/leaderboard/page.tsx`

- [ ] **Step 1: Create `src/modules/fantasy/queries/getManufacturerCupLeaderboard.ts`**

```typescript
import { pool } from '@/lib/db/client'

export type ManufacturerCupEntry = {
  rank: number
  userId: string
  username: string | null
  avatarUrl: string | null
  manufacturerName: string
  manufacturerSlug: string
  manufacturerLogoUrl: string | null
  seasonTotal: number
  eventsScored: number
}

export async function getManufacturerCupLeaderboard(
  seriesId: string,
  season: number
): Promise<ManufacturerCupEntry[]> {
  const res = await pool.query(
    `SELECT
       u.id AS "userId",
       u.name AS username,
       u.image AS "avatarUrl",
       bm.name AS "manufacturerName",
       bm.slug AS "manufacturerSlug",
       bm."logoUrl" AS "manufacturerLogoUrl",
       COALESCE(SUM(mes.points), 0) AS "seasonTotal",
       COUNT(mes.id) FILTER (WHERE mes.points > 0) AS "eventsScored"
     FROM manufacturer_picks mp
     JOIN users u ON u.id = mp."userId"
     JOIN bike_manufacturers bm ON bm.id = mp."manufacturerId"
     LEFT JOIN manufacturer_event_scores mes
       ON mes."manufacturerPickId" = mp.id
     WHERE mp."seriesId" = $1
       AND mp.season = $2
       AND mp."lockedAt" IS NOT NULL
     GROUP BY u.id, u.name, u.image, bm.name, bm.slug, bm."logoUrl"
     ORDER BY "seasonTotal" DESC, "eventsScored" DESC, u.id ASC`,
    [seriesId, season]
  )

  return res.rows.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    username: row.username,
    avatarUrl: row.avatarUrl,
    manufacturerName: row.manufacturerName,
    manufacturerSlug: row.manufacturerSlug,
    manufacturerLogoUrl: row.manufacturerLogoUrl,
    seasonTotal: Number(row.seasonTotal),
    eventsScored: Number(row.eventsScored),
  }))
}
```

- [ ] **Step 2: Create `src/ui/components/fantasy/ManufacturerCupTable.tsx`**

```tsx
import Image from 'next/image'
import type { ManufacturerCupEntry } from '@/modules/fantasy/queries/getManufacturerCupLeaderboard'

interface Props {
  entries: ManufacturerCupEntry[]
  currentUserId?: string
}

export function ManufacturerCupTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No manufacturer picks locked in yet. Standings will appear after Round 1 locks.
      </p>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)] uppercase">
          <th className="py-2 pr-4 w-10">#</th>
          <th className="py-2 pr-4">Player</th>
          <th className="py-2 pr-4">Manufacturer</th>
          <th className="py-2 pr-4 text-right">Season Pts</th>
          <th className="py-2 text-right">Rounds Scored</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(entry => {
          const isMe = entry.userId === currentUserId
          return (
            <tr
              key={entry.userId}
              className={`border-b border-[var(--color-border)] ${
                isMe ? 'bg-[var(--color-primary-bg)] font-semibold' : 'hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <td className="py-2.5 pr-4 tabular-nums">
                <span className={entry.rank <= 3 ? 'font-bold' : ''}>{entry.rank}</span>
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  {entry.avatarUrl
                    ? <Image src={entry.avatarUrl} alt="" width={24} height={24} className="rounded-full" />
                    : <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)]" />
                  }
                  <span>{entry.username ?? 'Unknown'}{isMe ? ' (you)' : ''}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  {entry.manufacturerLogoUrl && (
                    <Image src={entry.manufacturerLogoUrl} alt="" width={20} height={20} className="rounded" />
                  )}
                  <span>{entry.manufacturerName}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{entry.seasonTotal}</td>
              <td className="py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{entry.eventsScored}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Modify `src/app/fantasy/[series]/leaderboard/page.tsx` to add Manufacturer Cup tab**

Replace the current leaderboard page with a tabbed version. Note: Phase 4 will add a Championship tab — this adds the Manufacturer Cup tab alongside it. Use a `?tab=` URL search param for tab state (server-rendered, no client JS needed for initial load).

Full replacement:

```tsx
import { auth } from '@/lib/auth'
import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { getGlobalLeaderboard } from '@/modules/fantasy/queries/getLeaderboard'
import { getManufacturerCupLeaderboard } from '@/modules/fantasy/queries/getManufacturerCupLeaderboard'
import { LeaderboardTable } from '@/ui/components/fantasy/LeaderboardTable'
import { ManufacturerCupTable } from '@/ui/components/fantasy/ManufacturerCupTable'
import { notFound } from 'next/navigation'
import Link from 'next/link'

type Tab = 'global' | 'championship' | 'manufacturer'

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ series: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { series } = await params
  const { tab: rawTab } = await searchParams
  const tab: Tab = rawTab === 'manufacturer' ? 'manufacturer' : rawTab === 'championship' ? 'championship' : 'global'

  const session = await auth()
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  const globalEntries = tab === 'global'
    ? await getGlobalLeaderboard(seriesData.id, seriesData.season)
    : []
  const mfrEntries = tab === 'manufacturer'
    ? await getManufacturerCupLeaderboard(seriesData.id, seriesData.season)
    : []

  const tabs: { key: Tab; label: string }[] = [
    { key: 'global', label: 'Global' },
    { key: 'championship', label: 'Championship' },
    { key: 'manufacturer', label: 'Manufacturer Cup' },
  ]

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{seriesData.name} — Leaderboard</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/fantasy/${series}/leaderboard?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'global' && (
        globalEntries.length > 0
          ? <LeaderboardTable entries={globalEntries} currentUserId={session?.user?.id ?? undefined} />
          : <p className="text-sm text-[var(--color-text-muted)]">No scores yet. Standings will appear after the first event is scored.</p>
      )}

      {tab === 'championship' && (
        <p className="text-sm text-[var(--color-text-muted)]">Championship League standings — available to season pass holders. (Phase 4)</p>
      )}

      {tab === 'manufacturer' && (
        <ManufacturerCupTable
          entries={mfrEntries}
          currentUserId={session?.user?.id ?? undefined}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add \
  src/modules/fantasy/queries/getManufacturerCupLeaderboard.ts \
  "src/ui/components/fantasy/ManufacturerCupTable.tsx" \
  "src/app/fantasy/[series]/leaderboard/page.tsx"
git commit -m "feat(fantasy/mfr-cup): Manufacturer Cup leaderboard tab + query + table component"
```

---

## Chunk 6: Verification

### Task 8: End-to-end verification

- [ ] **Step 1: Run all fantasy module tests**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy
```

Expected: all tests pass, including:
- `manageManufacturer.test.ts` — 3 pass
- `pickManufacturer.test.ts` — 3 pass
- `manufacturerScoring.test.ts` — all pass

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Verify db schema matches Prisma schema**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma db push --accept-data-loss
```

Expected: `Your database is already in sync with your Prisma schema.`

- [ ] **Step 4: Manual smoke test checklist**

Run dev server:
```bash
cd /Users/kylewarner/Documents/ride-mtb && npm run dev
```

Verify:
- [ ] Navigate to `/admin/fantasy/manufacturers` — page loads, empty state shown
- [ ] Create a manufacturer (e.g. Trek, slug `trek`) — redirects to list, appears in table
- [ ] Edit a manufacturer — changes saved correctly
- [ ] Navigate to `/admin/fantasy/riders/[id]` — manufacturer dropdown appears, can assign
- [ ] Navigate to `/fantasy/[series]/` as logged-in user — ManufacturerPickCard shown, pick saves
- [ ] Round 1 roster deadline passes (manual DB update to past date) — card shows "Locked" badge
- [ ] Navigate to `/fantasy/[series]/leaderboard?tab=manufacturer` — Manufacturer Cup tab renders
- [ ] Post-results-score: `ManufacturerEventScore` rows created, `FantasyEventScore.manufacturerPoints` populated, `totalPoints` includes manufacturer bonus

- [ ] **Step 5: Final commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add .
git commit -m "feat(fantasy/mfr-cup): Phase 5 complete — Manufacturer Cup end-to-end"
```

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `src/modules/fantasy/actions/pickManufacturer.ts` | Server action: save/update pre-season manufacturer pick |
| `src/modules/fantasy/actions/admin/manageManufacturer.ts` | Server actions: create/update/delete BikeManufacturer |
| `src/modules/fantasy/queries/getManufacturerPick.ts` | Query: user's pick + season total for series hub |
| `src/modules/fantasy/queries/getManufacturerCupLeaderboard.ts` | Query: aggregate Manufacturer Cup standings |
| `src/ui/components/fantasy/ManufacturerPickCard.tsx` | Pick UI card with open/locked state |
| `src/ui/components/fantasy/ManufacturerCupTable.tsx` | Leaderboard table component for Manufacturer Cup tab |
| `src/app/admin/fantasy/manufacturers/page.tsx` | Admin list page |
| `src/app/admin/fantasy/manufacturers/new/page.tsx` | Admin create page |
| `src/app/admin/fantasy/manufacturers/[id]/page.tsx` | Admin edit page |
| `src/app/admin/fantasy/manufacturers/ManufacturerForm.tsx` | Shared admin form component |

## Summary of Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `BikeManufacturer`, `ManufacturerPick`, `ManufacturerEventScore` models; `manufacturerId` on `Rider`; `manufacturerPoints` on `FantasyEventScore` |
| `src/modules/fantasy/constants/scoring.ts` | Add `MANUFACTURER_POSITION_POINTS` half-table constant |
| `src/modules/fantasy/worker/resultsScore.ts` | Add manufacturer scoring pass (step 7.5) after team scoring |
| `src/app/fantasy/[series]/leaderboard/page.tsx` | Add tab bar + Manufacturer Cup tab |
| `src/app/fantasy/[series]/page.tsx` | Add `ManufacturerPickCard` above event list |
| `src/app/fantasy/[series]/team/page.tsx` | Add manufacturer badge in team panel header |
| `src/app/admin/fantasy/riders/RiderForm.tsx` | Add manufacturer dropdown field |
| `src/modules/fantasy/actions/admin/manageRider.ts` | Handle `manufacturerId` in create/update |
| `src/app/api/cron/fantasy/lock-rosters/route.ts` | Lock `ManufacturerPick` rows when Round 1 locks |
