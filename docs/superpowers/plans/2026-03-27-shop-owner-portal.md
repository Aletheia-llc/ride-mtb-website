# Shop Owner Portal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give bike shop owners a self-service portal to claim or submit their listing, then manage it — edit info, upload photos, respond to reviews, and track lead activity.

**Architecture:** Everything lives in `src/modules/shops/` and `src/app/shops/`. A single Prisma migration adds three enums, two new models, new fields on `Shop`, and renames the existing unnamed `User ↔ Shop` relation to avoid ambiguity. The owner dashboard uses nested routes under `/shops/[slug]/manage/[tab]`. Admin pages are added under `/admin/shops/`.

**Tech Stack:** Next.js 15 App Router, Prisma v7 (PrismaPg), Zod validation, Vercel Blob (photos), Upstash rate-limiting, server actions, CSS-only bar chart for analytics.

---

## File Map

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — add enums, new models, new fields, rename relations |
| `src/lib/auth/guards.ts` | Modify — add `requireShopOwner(slug)` |
| `src/modules/shops/lib/queries.ts` | Modify — add status filters + 5 new query functions |
| `src/modules/shops/actions/claimShop.ts` | Create |
| `src/modules/shops/actions/submitShop.ts` | Create |
| `src/modules/shops/actions/updateShop.ts` | Create |
| `src/modules/shops/actions/uploadShopPhoto.ts` | Create |
| `src/modules/shops/actions/respondToReview.ts` | Create |
| `src/modules/shops/actions/adminShops.ts` | Create |
| `src/modules/shops/components/ShopActionButtons.tsx` | Create |
| `src/modules/shops/components/owner/DashboardLayout.tsx` | Create |
| `src/modules/shops/components/owner/EditTab.tsx` | Create |
| `src/modules/shops/components/owner/PhotosTab.tsx` | Create |
| `src/modules/shops/components/owner/ReviewsTab.tsx` | Create |
| `src/modules/shops/components/owner/AnalyticsTab.tsx` | Create |
| `src/app/shops/[slug]/claim/page.tsx` | Create |
| `src/app/shops/submit/page.tsx` | Create |
| `src/app/shops/[slug]/manage/page.tsx` | Create (redirect only) |
| `src/app/shops/[slug]/manage/layout.tsx` | Create |
| `src/app/shops/[slug]/manage/edit/page.tsx` | Create |
| `src/app/shops/[slug]/manage/photos/page.tsx` | Create |
| `src/app/shops/[slug]/manage/reviews/page.tsx` | Create |
| `src/app/shops/[slug]/manage/analytics/page.tsx` | Create |
| `src/app/api/shops/[slug]/track/route.ts` | Create |
| `src/app/admin/shops/page.tsx` | Create |
| `src/app/admin/shops/[id]/page.tsx` | Create |
| `src/app/admin/shops/claims/page.tsx` | Create |
| `src/app/admin/shops/submissions/page.tsx` | Create |
| `src/app/admin/shops/preview/[id]/page.tsx` | Create |
| `src/app/shops/[slug]/page.tsx` | Modify — add claim link, swap buttons |

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

This is the trickiest task. Two existing unnamed relations (`User.shops` and `Shop.owner`) must be renamed in the same migration where `submittedBy` is added, or Prisma will fail to generate a migration due to ambiguous relations.

- [ ] **Step 1: Add the three new enums before the `Shop` model**

In `prisma/schema.prisma`, add after the existing `PartnerTier` enum (around line 1655):

```prisma
enum ShopStatus {
  DRAFT
  PENDING_REVIEW
  ACTIVE
  CLAIMED
}

enum ClaimStatus {
  PENDING
  APPROVED
  REJECTED
}

enum LeadEventType {
  WEBSITE_CLICK
  PHONE_CLICK
  DIRECTIONS_CLICK
}
```

- [ ] **Step 2: Modify the `Shop` model — add new fields, rename `owner` relation, add back-relations**

Replace the `Shop` model's `owner` line and add the new fields and back-relations:

```prisma
// Change line 1624 from:
//   owner  User?  @relation(fields: [ownerId], references: [id], onDelete: SetNull)
// To:
  owner             User?      @relation("ShopOwner", fields: [ownerId], references: [id], onDelete: SetNull)

// Add these new fields (after `updatedAt`):
  status            ShopStatus @default(ACTIVE)
  submittedByUserId String?
  submittedBy       User?      @relation("ShopSubmittedBy", fields: [submittedByUserId], references: [id])

// Add these back-relations (after `affiliateLinks`):
  claimRequests     ShopClaimRequest[]
  leadEvents        LeadEvent[]
```

- [ ] **Step 3: Modify the `User` model — rename `shops` relation, add two new back-relations**

```prisma
// Change line 95 from:
//   shops  Shop[]
// To:
  shops             Shop[]              @relation("ShopOwner")

// Add after `shops`:
  submittedShops    Shop[]              @relation("ShopSubmittedBy")
  shopClaimRequests ShopClaimRequest[]
```

- [ ] **Step 4: Add the `ShopClaimRequest` model** (after the `ReviewHelpful` model, around line 1700):

```prisma
model ShopClaimRequest {
  id           String      @id @default(cuid())
  shopId       String
  userId       String
  businessRole String
  proofDetail  String      @db.Text
  status       ClaimStatus @default(PENDING)
  adminNote    String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  shop  Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([shopId, userId])
  @@map("shop_claim_requests")
}
```

- [ ] **Step 5: Add the `LeadEvent` model** (after `ShopClaimRequest`):

```prisma
model LeadEvent {
  id        String        @id @default(cuid())
  shopId    String
  eventType LeadEventType
  createdAt DateTime      @default(now())

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@index([shopId, createdAt])
  @@map("lead_events")
}
```

- [ ] **Step 6: Generate and apply the migration**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma migrate dev --name shop-owner-portal
```

Expected: Migration file created and applied, Prisma client regenerated. Watch for "Found N errors" — if Prisma complains about ambiguous relations, verify both the `User.shops` rename (Step 3) and the `Shop.owner` rename (Step 2) are in the schema.

- [ ] **Step 7: Verify generated types exist**

```bash
node -e "const { ShopStatus, ClaimStatus, LeadEventType } = require('./src/generated/prisma/client'); console.log(ShopStatus, ClaimStatus, LeadEventType)"
```

Expected: Three enum objects printed with their values.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ShopStatus, ClaimStatus, LeadEventType enums and ShopClaimRequest, LeadEvent models"
```

---

## Task 2: Auth Guard

**Files:**
- Modify: `src/lib/auth/guards.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/__tests__/guards.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/auth/config', () => ({ auth: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }))
vi.mock('@/lib/db/client', () => ({ db: { shop: { findUnique: vi.fn() } } }))

import { auth } from '@/lib/auth/config'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { requireShopOwner } from '../guards'

const mockAuth = vi.mocked(auth)
const mockRedirect = vi.mocked(redirect)
const mockNotFound = vi.mocked(notFound)
const mockFindUnique = vi.mocked(db.shop.findUnique)

beforeEach(() => vi.clearAllMocks())

describe('requireShopOwner', () => {
  it('redirects to /signin if not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    mockRedirect.mockImplementation(() => { throw new Error('redirect') })

    await expect(requireShopOwner('my-shop')).rejects.toThrow('redirect')
    expect(mockRedirect).toHaveBeenCalledWith('/signin')
  })

  it('calls notFound if shop does not exist', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue(null)
    mockNotFound.mockImplementation(() => { throw new Error('notFound') })

    await expect(requireShopOwner('nonexistent')).rejects.toThrow('notFound')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('redirects to /403 if user is not the owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue({ id: 's1', ownerId: 'u-other', slug: 'my-shop' } as any)
    mockRedirect.mockImplementation(() => { throw new Error('redirect') })

    await expect(requireShopOwner('my-shop')).rejects.toThrow('redirect')
    expect(mockRedirect).toHaveBeenCalledWith('/403')
  })

  it('returns shop and user if user is the owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'user', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue({ id: 's1', ownerId: 'u1', slug: 'my-shop' } as any)

    const result = await requireShopOwner('my-shop')
    expect(result.user.id).toBe('u1')
    expect(result.shop.slug).toBe('my-shop')
  })

  it('allows admin to access any shop', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin', bannedAt: null } } as any)
    mockFindUnique.mockResolvedValue({ id: 's1', ownerId: 'u-other', slug: 'my-shop' } as any)

    const result = await requireShopOwner('my-shop')
    expect(result.user.id).toBe('admin1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx vitest run src/lib/auth/__tests__/guards.test.ts
```

Expected: FAIL — `requireShopOwner` is not exported.

- [ ] **Step 3: Implement `requireShopOwner` in `src/lib/auth/guards.ts`**

Add at the end of the file:

```typescript
import { notFound } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function requireShopOwner(slug: string) {
  const user = await requireAuth()
  const shop = await db.shop.findUnique({ where: { slug } })
  if (!shop) notFound()
  if (shop.ownerId !== user.id && user.role !== 'admin') redirect('/403')
  return { user, shop }
}
```

Note: `notFound` and `db` imports need to be added at the top of the file alongside existing imports.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/auth/__tests__/guards.test.ts
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/guards.ts src/lib/auth/__tests__/guards.test.ts
git commit -m "feat: add requireShopOwner auth guard"
```

---

## Task 3: Query Additions

**Files:**
- Modify: `src/modules/shops/lib/queries.ts`

- [ ] **Step 1: Add status filter to all 4 public queries**

In `getShops` (line ~45): add `status: { in: [ShopStatus.ACTIVE, ShopStatus.CLAIMED] }` to the `where` object initializer:

```typescript
import { ShopStatus } from '@/generated/prisma/client'

// In getShops, change:
const where: Record<string, unknown> = {}
// to:
const where: Record<string, unknown> = {
  status: { in: [ShopStatus.ACTIVE, ShopStatus.CLAIMED] },
}
```

In `getShopBySlug`: wrap the `findUnique` in a status check — after fetching, if `shop && shop.status !== ShopStatus.ACTIVE && shop.status !== ShopStatus.CLAIMED`, return `null`.

In `getShopWithDetails`: same pattern — check status after fetching, return `null` if not public.

In `getShopsInBounds`: add `status: { in: [ShopStatus.ACTIVE, ShopStatus.CLAIMED] }` to the `where` object.

- [ ] **Step 2: Add `getShopForOwner` query**

```typescript
export async function getShopForOwner(slug: string) {
  return db.shop.findUnique({
    where: { slug },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
    },
  })
}
```

- [ ] **Step 3: Add `getShopLeadSummary` and `getShopLeadsByDay` queries**

```typescript
export async function getShopLeadSummary(shopId: string): Promise<{
  websiteClicks: number
  phoneClicks: number
  directionsClicks: number
}> {
  const [websiteClicks, phoneClicks, directionsClicks] = await Promise.all([
    db.leadEvent.count({ where: { shopId, eventType: 'WEBSITE_CLICK' } }),
    db.leadEvent.count({ where: { shopId, eventType: 'PHONE_CLICK' } }),
    db.leadEvent.count({ where: { shopId, eventType: 'DIRECTIONS_CLICK' } }),
  ])
  return { websiteClicks, phoneClicks, directionsClicks }
}

export async function getShopLeadsByDay(
  shopId: string,
  days: number = 30,
): Promise<{ date: string; websiteClicks: number; phoneClicks: number; directionsClicks: number }[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const events = await db.leadEvent.findMany({
    where: { shopId, createdAt: { gte: since } },
    select: { eventType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const map = new Map<string, { websiteClicks: number; phoneClicks: number; directionsClicks: number }>()

  // Pre-fill all days
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    map.set(key, { websiteClicks: 0, phoneClicks: 0, directionsClicks: 0 })
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10)
    const entry = map.get(key)
    if (!entry) continue
    if (event.eventType === 'WEBSITE_CLICK') entry.websiteClicks++
    else if (event.eventType === 'PHONE_CLICK') entry.phoneClicks++
    else if (event.eventType === 'DIRECTIONS_CLICK') entry.directionsClicks++
  }

  return Array.from(map.entries()).map(([date, counts]) => ({ date, ...counts }))
}
```

- [ ] **Step 4: Add `getPendingClaims` and `getPendingSubmissions` queries**

```typescript
export async function getPendingClaims() {
  return db.shopClaimRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      shop: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getPendingSubmissions() {
  return db.shop.findMany({
    where: { status: ShopStatus.PENDING_REVIEW },
    select: {
      id: true,
      name: true,
      shopType: true,
      city: true,
      state: true,
      createdAt: true,
      submittedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit --project tsconfig.json 2>&1 | grep "shops/lib/queries"
```

Expected: No errors for that file.

- [ ] **Step 6: Commit**

```bash
git add src/modules/shops/lib/queries.ts
git commit -m "feat: add status filters to public shop queries and new owner/admin query functions"
```

---

## Task 4: Claim Flow

**Files:**
- Create: `src/modules/shops/actions/claimShop.ts`
- Create: `src/app/shops/[slug]/claim/page.tsx`

- [ ] **Step 1: Create the `claimShop` server action**

`src/modules/shops/actions/claimShop.ts`:

```typescript
'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  shopId: z.string().min(1),
  businessRole: z.enum(['Owner', 'Manager', 'Employee']),
  proofDetail: z.string().min(10).max(1000),
})

export type ClaimState = { errors: Record<string, string>; success?: boolean }

export async function claimShop(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }
    const { shopId, businessRole, proofDetail } = parsed.data

    const existing = await db.shopClaimRequest.findUnique({
      where: { shopId_userId: { shopId, userId: user.id } },
    })
    if (existing) {
      return { errors: { general: 'You already have a pending claim for this shop' } }
    }

    await db.shopClaimRequest.create({
      data: { shopId, userId: user.id, businessRole, proofDetail },
    })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
```

- [ ] **Step 2: Create the claim page**

`src/app/shops/[slug]/claim/page.tsx`:

```typescript
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ClaimForm } from '@/modules/shops/components/ClaimForm'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const shop = await db.shop.findUnique({ where: { slug }, select: { id: true, name: true, ownerId: true } })
  if (!shop) notFound()
  if (shop.ownerId) redirect(`/shops/${slug}`) // Already claimed

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Claim {shop.name}</h1>
      <p className="mb-6 text-[var(--color-text-muted)] text-sm">
        Submit a claim request. An admin will review and approve it.
      </p>
      <ClaimForm shopId={shop.id} />
    </div>
  )
}
```

- [ ] **Step 3: Create the `ClaimForm` client component**

`src/modules/shops/components/ClaimForm.tsx`:

```typescript
'use client'
import { useActionState } from 'react'
import { claimShop, type ClaimState } from '../actions/claimShop'

const initial: ClaimState = { errors: {} }

export function ClaimForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState(claimShop, initial)

  if (state.success) {
    return <p className="text-green-600">Claim submitted! We&apos;ll review and notify you.</p>
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="shopId" value={shopId} />

      <div>
        <label className="block text-sm font-medium mb-1">Your role at this shop</label>
        <select name="businessRole" className="input w-full" defaultValue="Owner">
          <option value="Owner">Owner</option>
          <option value="Manager">Manager</option>
          <option value="Employee">Employee</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Proof of association</label>
        <textarea
          name="proofDetail"
          className="input w-full min-h-[100px]"
          placeholder="e.g. I'm the owner — business email: kyle@bluepinebikes.com"
          required
        />
      </div>

      {state.errors.general && (
        <p className="text-red-600 text-sm">{state.errors.general}</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? 'Submitting…' : 'Submit Claim'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Type-check the new files**

```bash
npx tsc --noEmit 2>&1 | grep "claim"
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/shops/actions/claimShop.ts \
        src/modules/shops/components/ClaimForm.tsx \
        src/app/shops/\[slug\]/claim/page.tsx
git commit -m "feat: add claim shop flow (action + form page)"
```

---

## Task 5: Submit New Shop Flow

**Files:**
- Create: `src/modules/shops/actions/submitShop.ts`
- Create: `src/app/shops/submit/page.tsx`

- [ ] **Step 1: Create the `submitShop` server action**

`src/modules/shops/actions/submitShop.ts`:

```typescript
'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { uniqueSlug } from '@/lib/slugify'
import { ShopStatus } from '@/generated/prisma/client'

const schema = z.object({
  name: z.string().min(2).max(120),
  shopType: z.string().min(1),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  services: z.string().optional(), // comma-separated
  brands: z.string().optional(),   // comma-separated
  hoursJson: z.string().optional(), // JSON string
})

export type SubmitShopState = { errors: Record<string, string>; success?: boolean; slug?: string }

export async function submitShop(_prev: SubmitShopState, formData: FormData): Promise<SubmitShopState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }

    const { name, shopType, services, brands, hoursJson, email, websiteUrl, ...rest } = parsed.data

    const slug = await uniqueSlug(name, (s) =>
      db.shop.findUnique({ where: { slug: s } }).then(Boolean)
    )

    const shop = await db.shop.create({
      data: {
        ...rest,
        name,
        slug,
        shopType: shopType as any,
        status: ShopStatus.PENDING_REVIEW,
        ownerId: user.id,
        submittedByUserId: user.id,
        services: services ? services.split(',').map((s) => s.trim()).filter(Boolean) : [],
        brands: brands ? brands.split(',').map((b) => b.trim()).filter(Boolean) : [],
        email: email || null,
        websiteUrl: websiteUrl || null,
        hoursJson: hoursJson ? JSON.parse(hoursJson) : null,
      },
    })

    return { errors: {}, success: true, slug: shop.slug }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
```

- [ ] **Step 2: Create the submit page**

`src/app/shops/submit/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { SubmitShopForm } from '@/modules/shops/components/SubmitShopForm'

export default async function SubmitShopPage() {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Add Your Shop</h1>
      <p className="mb-8 text-[var(--color-text-muted)] text-sm">
        Submit your shop for review. Once approved, it will appear in the directory and you&apos;ll be set as the owner.
      </p>
      <SubmitShopForm />
    </div>
  )
}
```

- [ ] **Step 3: Create the multi-step `SubmitShopForm` component**

`src/modules/shops/components/SubmitShopForm.tsx`:

```typescript
'use client'
import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { submitShop, type SubmitShopState } from '../actions/submitShop'

const initial: SubmitShopState = { errors: {} }

const SHOP_TYPES = [
  'LOCAL_SHOP', 'CHAIN_STORE', 'ONLINE_RETAILER', 'RENTAL_SHOP',
  'REPAIR_ONLY', 'SUSPENSION_SPECIALIST', 'WHEEL_BUILDER', 'CUSTOM_BUILDER',
  'DEMO_CENTER', 'GUIDE_SERVICE', 'COACHING', 'TRAIL_ADVOCACY', 'OTHER',
]

export function SubmitShopForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, action, pending] = useActionState(submitShop, initial)

  if (state.success && state.slug) {
    router.push(`/shops/${state.slug}/manage/edit`)
    return null
  }

  return (
    <form action={action} className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2 text-sm mb-6">
        {[1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              s === step ? 'bg-[var(--color-primary)] text-white' : s < step ? 'bg-green-500 text-white' : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Shop Name *</label>
            <input name="name" className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Shop Type *</label>
            <select name="shopType" className="input w-full" defaultValue="LOCAL_SHOP">
              {SHOP_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Street Address *</label>
            <input name="address" className="input w-full" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input name="city" className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State *</label>
              <input name="state" className="input w-full" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ZIP Code</label>
            <input name="zipCode" className="input w-full" />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Contact & Hours</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input name="phone" type="tel" className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input name="websiteUrl" type="url" className="input w-full" placeholder="https://" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Hours can be added after approval from your owner dashboard.</p>
          <div className="flex gap-3">
            <button type="button" className="btn" onClick={() => setStep(1)}>← Back</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Services & Brands</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Services (comma-separated)</label>
            <input name="services" className="input w-full" placeholder="Bike Fitting, Suspension Tuning, Wheel Building" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brands Carried (comma-separated)</label>
            <input name="brands" className="input w-full" placeholder="Trek, Specialized, Santa Cruz" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" className="input w-full min-h-[100px]" />
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn" onClick={() => setStep(2)}>← Back</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>Review →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Review & Submit</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your listing will be submitted for admin review. You won&apos;t appear in the public directory until approved.
          </p>
          {state.errors.general && (
            <p className="text-red-600 text-sm">{state.errors.general}</p>
          )}
          <div className="flex gap-3">
            <button type="button" className="btn" onClick={() => setStep(3)}>← Back</button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? 'Submitting…' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "submit"
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/shops/actions/submitShop.ts \
        src/modules/shops/components/SubmitShopForm.tsx \
        src/app/shops/submit/page.tsx
git commit -m "feat: add submit new shop flow (action + multi-step form)"
```

---

## Task 6: Owner Dashboard Layout + Edit Tab

**Files:**
- Create: `src/modules/shops/actions/updateShop.ts`
- Create: `src/modules/shops/components/owner/DashboardLayout.tsx`
- Create: `src/app/shops/[slug]/manage/layout.tsx`
- Create: `src/app/shops/[slug]/manage/page.tsx`
- Create: `src/app/shops/[slug]/manage/edit/page.tsx`

- [ ] **Step 1: Create the `updateShop` server action**

`src/modules/shops/actions/updateShop.ts`:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  shopType: z.string().min(1),
  services: z.string().optional(),
  brands: z.string().optional(),
  hoursJson: z.string().optional(),
})

export type UpdateShopState = { errors: Record<string, string>; success?: boolean }

export async function updateShop(slug: string, _prev: UpdateShopState, formData: FormData): Promise<UpdateShopState> {
  try {
    const { shop } = await requireShopOwner(slug)
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }

    const { services, brands, hoursJson, email, websiteUrl, shopType, ...rest } = parsed.data

    await db.shop.update({
      where: { id: shop.id },
      data: {
        ...rest,
        shopType: shopType as any,
        services: services ? services.split(',').map((s) => s.trim()).filter(Boolean) : [],
        brands: brands ? brands.split(',').map((b) => b.trim()).filter(Boolean) : [],
        email: email || null,
        websiteUrl: websiteUrl || null,
        hoursJson: hoursJson ? JSON.parse(hoursJson) : null,
      },
    })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
```

- [ ] **Step 2: Create the `DashboardLayout` component**

`src/modules/shops/components/owner/DashboardLayout.tsx`:

```typescript
import Link from 'next/link'
import type { ShopStatus } from '@/generated/prisma/client'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  CLAIMED: 'Claimed',
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLAIMED: 'bg-blue-100 text-blue-800',
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
}

const TABS = [
  { href: 'edit', label: 'Edit Info' },
  { href: 'photos', label: 'Photos' },
  { href: 'reviews', label: 'Reviews' },
  { href: 'analytics', label: 'Analytics' },
]

interface Props {
  shopName: string
  shopSlug: string
  shopStatus: ShopStatus
  activeTab: string
  children: React.ReactNode
}

export function DashboardLayout({ shopName, shopSlug, shopStatus, activeTab, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{shopName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[shopStatus] ?? ''}`}>
              {STATUS_LABELS[shopStatus] ?? shopStatus}
            </span>
            <Link
              href={`/shops/${shopSlug}`}
              target="_blank"
              className="text-xs text-[var(--color-text-muted)] hover:underline"
            >
              View public listing ↗
            </Link>
          </div>
        </div>
      </div>

      <nav className="mb-8 flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/shops/${shopSlug}/manage/${tab.href}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.href
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create the manage layout**

`src/app/shops/[slug]/manage/layout.tsx`:

```typescript
import { requireShopOwner } from '@/lib/auth/guards'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function ManageLayout({ children, params }: Props) {
  // Auth check — redirects non-owners before rendering anything
  await requireShopOwner((await params).slug)
  return <>{children}</>
}
```

- [ ] **Step 4: Create the redirect page**

`src/app/shops/[slug]/manage/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ManagePage({ params }: Props) {
  const { slug } = await params
  redirect(`/shops/${slug}/manage/edit`)
}
```

- [ ] **Step 5: Create the `EditTab` component**

`src/modules/shops/components/owner/EditTab.tsx`:

```typescript
'use client'
import { useActionState } from 'react'
import type { updateShop } from '../../actions/updateShop'
import type { ShopDetailData } from '../../types'

type UpdateAction = typeof updateShop
type State = Awaited<ReturnType<UpdateAction>>

const SHOP_TYPES = [
  'LOCAL_SHOP', 'CHAIN_STORE', 'ONLINE_RETAILER', 'RENTAL_SHOP',
  'REPAIR_ONLY', 'SUSPENSION_SPECIALIST', 'WHEEL_BUILDER', 'CUSTOM_BUILDER',
  'DEMO_CENTER', 'GUIDE_SERVICE', 'COACHING', 'TRAIL_ADVOCACY', 'OTHER',
]

interface Props {
  shop: ShopDetailData & { shopType: string; status: string }
  action: (prev: State, formData: FormData) => Promise<State>
}

export function EditTab({ shop, action }: Props) {
  const [state, formAction, pending] = useActionState(action, { errors: {} })

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Shop Name *</label>
        <input name="name" defaultValue={shop.name} className="input w-full" required />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Shop Type</label>
        <select name="shopType" className="input w-full" defaultValue={shop.shopType}>
          {SHOP_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea name="description" defaultValue={shop.description ?? ''} className="input w-full min-h-[100px]" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Street Address *</label>
        <input name="address" defaultValue={shop.address} className="input w-full" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City *</label>
          <input name="city" defaultValue={shop.city} className="input w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State *</label>
          <input name="state" defaultValue={shop.state} className="input w-full" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">ZIP Code</label>
        <input name="zipCode" defaultValue={shop.zipCode ?? ''} className="input w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input name="phone" type="tel" defaultValue={shop.phone ?? ''} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" defaultValue={shop.email ?? ''} className="input w-full" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Website</label>
        <input name="websiteUrl" type="url" defaultValue={shop.websiteUrl ?? ''} className="input w-full" placeholder="https://" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Services (comma-separated)</label>
        <input
          name="services"
          defaultValue={Array.isArray(shop.services) ? (shop.services as string[]).join(', ') : ''}
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Brands (comma-separated)</label>
        <input
          name="brands"
          defaultValue={Array.isArray(shop.brands) ? (shop.brands as string[]).join(', ') : ''}
          className="input w-full"
        />
      </div>

      {state.errors.general && (
        <p className="text-red-600 text-sm">{state.errors.general}</p>
      )}
      {state.success && (
        <p className="text-green-600 text-sm">Changes saved.</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Create the edit page**

`src/app/shops/[slug]/manage/edit/page.tsx`:

```typescript
import { requireShopOwner } from '@/lib/auth/guards'
import { getShopForOwner } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { EditTab } from '@/modules/shops/components/owner/EditTab'
import { updateShop } from '@/modules/shops/actions/updateShop'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditPage({ params }: Props) {
  const { slug } = await params
  await requireShopOwner(slug) // auth guard

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const boundAction = updateShop.bind(null, slug)

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="edit"
    >
      <EditTab shop={shop as any} action={boundAction} />
    </DashboardLayout>
  )
}
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "manage"
```

Expected: No errors for manage route files.

- [ ] **Step 8: Commit**

```bash
git add src/modules/shops/actions/updateShop.ts \
        src/modules/shops/components/owner/ \
        src/app/shops/\[slug\]/manage/
git commit -m "feat: add owner dashboard layout and edit info tab"
```

---

## Task 7: Photos Tab

**Files:**
- Create: `src/modules/shops/actions/uploadShopPhoto.ts`
- Create: `src/modules/shops/components/owner/PhotosTab.tsx`
- Create: `src/app/shops/[slug]/manage/photos/page.tsx`

- [ ] **Step 1: Create the photo management actions**

`src/modules/shops/actions/uploadShopPhoto.ts`:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { put, del } from '@vercel/blob'
import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export type PhotoState = { errors: Record<string, string>; success?: boolean }

export async function uploadShopPhoto(slug: string, _prev: PhotoState, formData: FormData): Promise<PhotoState> {
  try {
    const { shop } = await requireShopOwner(slug)

    const photoCount = await db.shopPhoto.count({ where: { shopId: shop.id } })
    if (photoCount >= 10) {
      return { errors: { general: 'Maximum 10 photos per shop' } }
    }

    const file = formData.get('photo') as File | null
    if (!file || file.size === 0) {
      return { errors: { general: 'No file provided' } }
    }

    const blob = await put(`shops/${shop.id}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })

    const maxOrder = await db.shopPhoto.findFirst({
      where: { shopId: shop.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    await db.shopPhoto.create({
      data: {
        shopId: shop.id,
        url: blob.url,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Upload failed. Please try again.' } }
  }
}

export async function deleteShopPhoto(slug: string, photoId: string): Promise<PhotoState> {
  try {
    const { shop } = await requireShopOwner(slug)

    const photo = await db.shopPhoto.findFirst({ where: { id: photoId, shopId: shop.id } })
    if (!photo) return { errors: { general: 'Photo not found' } }

    await del(photo.url)
    await db.shopPhoto.delete({ where: { id: photoId } })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Failed to delete photo' } }
  }
}

export async function setPhotoAsCover(slug: string, photoId: string): Promise<PhotoState> {
  try {
    const { shop } = await requireShopOwner(slug)

    await db.$transaction([
      db.shopPhoto.updateMany({ where: { shopId: shop.id }, data: { isPrimary: false } }),
      db.shopPhoto.update({ where: { id: photoId }, data: { isPrimary: true } }),
    ])

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Failed to set cover photo' } }
  }
}
```

- [ ] **Step 2: Create the `PhotosTab` component**

`src/modules/shops/components/owner/PhotosTab.tsx`:

```typescript
'use client'
import { useActionState } from 'react'
import Image from 'next/image'
import type { uploadShopPhoto, deleteShopPhoto, setPhotoAsCover } from '../../actions/uploadShopPhoto'

type UploadAction = typeof uploadShopPhoto
type State = Awaited<ReturnType<UploadAction>>

interface Photo {
  id: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

interface Props {
  photos: Photo[]
  uploadAction: (prev: State, formData: FormData) => Promise<State>
  deleteAction: (photoId: string) => Promise<State>
  setCoverAction: (photoId: string) => Promise<State>
}

export function PhotosTab({ photos, uploadAction, deleteAction, setCoverAction }: Props) {
  const [state, formAction, pending] = useActionState(uploadAction, { errors: {} })

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <form action={formAction} className="space-y-3">
        <h2 className="font-medium">Add Photo ({photos.length}/10)</h2>
        <input type="file" name="photo" accept="image/*" className="block" required />
        {state.errors.general && <p className="text-red-600 text-sm">{state.errors.general}</p>}
        {state.success && <p className="text-green-600 text-sm">Photo uploaded.</p>}
        <button type="submit" disabled={pending || photos.length >= 10} className="btn btn-primary">
          {pending ? 'Uploading…' : 'Upload Photo'}
        </button>
      </form>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group rounded overflow-hidden border border-[var(--color-border)]">
            <Image src={photo.url} alt="" width={200} height={150} className="w-full h-36 object-cover" />
            {photo.isPrimary && (
              <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">Cover</span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {!photo.isPrimary && (
                <button
                  onClick={() => setCoverAction(photo.id)}
                  className="btn text-xs py-1 px-2"
                >
                  Set Cover
                </button>
              )}
              <button
                onClick={() => deleteAction(photo.id)}
                className="btn text-xs py-1 px-2 text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the photos page**

`src/app/shops/[slug]/manage/photos/page.tsx`:

```typescript
import { requireShopOwner } from '@/lib/auth/guards'
import { getShopForOwner } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { PhotosTab } from '@/modules/shops/components/owner/PhotosTab'
import { uploadShopPhoto, deleteShopPhoto, setPhotoAsCover } from '@/modules/shops/actions/uploadShopPhoto'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PhotosPage({ params }: Props) {
  const { slug } = await params
  await requireShopOwner(slug)

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const uploadAction = uploadShopPhoto.bind(null, slug)
  const deleteAction = deleteShopPhoto.bind(null, slug)
  const setCoverAction = setPhotoAsCover.bind(null, slug)

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="photos"
    >
      <PhotosTab
        photos={shop.photos}
        uploadAction={uploadAction}
        deleteAction={deleteAction}
        setCoverAction={setCoverAction}
      />
    </DashboardLayout>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "photos"
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/shops/actions/uploadShopPhoto.ts \
        src/modules/shops/components/owner/PhotosTab.tsx \
        src/app/shops/\[slug\]/manage/photos/page.tsx
git commit -m "feat: add shop photos tab (Vercel Blob upload, delete, set cover)"
```

---

## Task 8: Reviews Tab

**Files:**
- Create: `src/modules/shops/actions/respondToReview.ts`
- Create: `src/modules/shops/components/owner/ReviewsTab.tsx`
- Create: `src/app/shops/[slug]/manage/reviews/page.tsx`

- [ ] **Step 1: Create the `respondToReview` action**

`src/modules/shops/actions/respondToReview.ts`:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  reviewId: z.string().min(1),
  ownerResponse: z.string().min(5).max(2000),
})

export type ResponseState = { errors: Record<string, string>; success?: boolean }

export async function respondToReview(slug: string, _prev: ResponseState, formData: FormData): Promise<ResponseState> {
  try {
    const { shop } = await requireShopOwner(slug)
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }

    const { reviewId, ownerResponse } = parsed.data

    // Verify the review belongs to this shop
    const review = await db.shopReview.findFirst({
      where: { id: reviewId, shopId: shop.id },
    })
    if (!review) return { errors: { general: 'Review not found' } }
    if (review.ownerResponse) return { errors: { general: 'Already responded to this review' } }

    await db.shopReview.update({
      where: { id: reviewId },
      data: { ownerResponse, ownerResponseAt: new Date() },
    })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
```

- [ ] **Step 2: Create the `ReviewsTab` component**

`src/modules/shops/components/owner/ReviewsTab.tsx`:

```typescript
'use client'
import { useState, useActionState } from 'react'
import type { respondToReview } from '../../actions/respondToReview'

type Action = typeof respondToReview
type State = Awaited<ReturnType<Action>>

interface Review {
  id: string
  user: { name: string | null }
  overallRating: number
  title: string | null
  body: string
  ownerResponse: string | null
  createdAt: Date
}

interface Props {
  reviews: Review[]
  replyAction: (prev: State, formData: FormData) => Promise<State>
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function ReviewRow({ review, replyAction }: { review: Review; replyAction: Props['replyAction'] }) {
  const [showForm, setShowForm] = useState(false)
  const [state, action, pending] = useActionState(replyAction, { errors: {} })

  return (
    <div className="border-b border-[var(--color-border)] pb-6 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sm">{review.user.name ?? 'Anonymous'}</p>
          <StarRating rating={review.overallRating} />
          <p className="text-xs text-[var(--color-text-muted)]">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      {review.title && <p className="mt-2 font-medium text-sm">{review.title}</p>}
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{review.body}</p>

      {review.ownerResponse ? (
        <div className="mt-3 rounded bg-[var(--color-surface-raised)] p-3">
          <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Your response:</p>
          <p className="text-sm">{review.ownerResponse}</p>
        </div>
      ) : (
        <>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
            >
              Reply to this review
            </button>
          )}
          {showForm && (
            <form action={action} className="mt-3 space-y-2">
              <input type="hidden" name="reviewId" value={review.id} />
              <textarea
                name="ownerResponse"
                className="input w-full min-h-[80px] text-sm"
                placeholder="Write a professional response…"
                required
              />
              {state.errors.general && <p className="text-red-600 text-xs">{state.errors.general}</p>}
              {state.success && <p className="text-green-600 text-xs">Response saved.</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="btn btn-primary text-xs py-1 px-3">
                  {pending ? 'Saving…' : 'Post Response'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn text-xs py-1 px-3">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}

export function ReviewsTab({ reviews, replyAction }: Props) {
  if (reviews.length === 0) {
    return <p className="text-[var(--color-text-muted)] text-sm">No reviews yet.</p>
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewRow key={review.id} review={review} replyAction={replyAction} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create the reviews page**

`src/app/shops/[slug]/manage/reviews/page.tsx`:

```typescript
import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { getShopForOwner } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { ReviewsTab } from '@/modules/shops/components/owner/ReviewsTab'
import { respondToReview } from '@/modules/shops/actions/respondToReview'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ReviewsPage({ params }: Props) {
  const { slug } = await params
  await requireShopOwner(slug)

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const reviews = await db.shopReview.findMany({
    where: { shopId: shop.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const replyAction = respondToReview.bind(null, slug)

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="reviews"
    >
      <ReviewsTab reviews={reviews} replyAction={replyAction} />
    </DashboardLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/shops/actions/respondToReview.ts \
        src/modules/shops/components/owner/ReviewsTab.tsx \
        src/app/shops/\[slug\]/manage/reviews/page.tsx
git commit -m "feat: add owner review response tab"
```

---

## Task 9: Analytics Tab

**Files:**
- Create: `src/modules/shops/components/owner/AnalyticsTab.tsx`
- Create: `src/app/shops/[slug]/manage/analytics/page.tsx`

- [ ] **Step 1: Create the `AnalyticsTab` component** (CSS-only bar chart, no external library)

`src/modules/shops/components/owner/AnalyticsTab.tsx`:

```typescript
interface DayStat {
  date: string
  websiteClicks: number
  phoneClicks: number
  directionsClicks: number
}

interface Summary {
  websiteClicks: number
  phoneClicks: number
  directionsClicks: number
}

interface Props {
  summary: Summary
  byDay: DayStat[]
}

export function AnalyticsTab({ summary, byDay }: Props) {
  const maxTotal = Math.max(...byDay.map((d) => d.websiteClicks + d.phoneClicks + d.directionsClicks), 1)

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Website Clicks" value={summary.websiteClicks} color="bg-blue-500" />
        <SummaryCard label="Phone Clicks" value={summary.phoneClicks} color="bg-green-500" />
        <SummaryCard label="Directions Clicks" value={summary.directionsClicks} color="bg-purple-500" />
      </div>

      {/* 30-day chart */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Last 30 days</h2>
        <div className="flex items-end gap-px h-32 overflow-hidden">
          {byDay.map((day) => {
            const total = day.websiteClicks + day.phoneClicks + day.directionsClicks
            const height = total === 0 ? 0 : Math.max(4, Math.round((total / maxTotal) * 100))
            return (
              <div
                key={day.date}
                title={`${day.date}\nWebsite: ${day.websiteClicks}\nPhone: ${day.phoneClicks}\nDirections: ${day.directionsClicks}`}
                className="flex-1 flex flex-col-reverse"
                style={{ height: '100%' }}
              >
                <div
                  className="w-full rounded-sm bg-[var(--color-primary)] opacity-80 hover:opacity-100 transition-opacity"
                  style={{ height: `${height}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>{byDay[0]?.date ?? ''}</span>
          <span>{byDay[byDay.length - 1]?.date ?? ''}</span>
        </div>
        <div className="mt-3 flex gap-4 text-xs">
          <LegendItem color="bg-blue-500" label="Website" />
          <LegendItem color="bg-green-500" label="Phone" />
          <LegendItem color="bg-purple-500" label="Directions" />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <div className={`mb-2 h-1 w-8 rounded ${color}`} />
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{label}</p>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Create the analytics page**

`src/app/shops/[slug]/manage/analytics/page.tsx`:

```typescript
import { requireShopOwner } from '@/lib/auth/guards'
import { getShopForOwner, getShopLeadSummary, getShopLeadsByDay } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { AnalyticsTab } from '@/modules/shops/components/owner/AnalyticsTab'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { slug } = await params
  await requireShopOwner(slug)

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const [summary, byDay] = await Promise.all([
    getShopLeadSummary(shop.id),
    getShopLeadsByDay(shop.id, 30),
  ])

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="analytics"
    >
      <AnalyticsTab summary={summary} byDay={byDay} />
    </DashboardLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/shops/components/owner/AnalyticsTab.tsx \
        src/app/shops/\[slug\]/manage/analytics/page.tsx
git commit -m "feat: add owner analytics tab with CSS-only bar chart"
```

---

## Task 10: Lead Tracking

**Files:**
- Create: `src/modules/shops/components/ShopActionButtons.tsx`
- Create: `src/app/api/shops/[slug]/track/route.ts`

- [ ] **Step 1: Create the API route**

`src/app/api/shops/[slug]/track/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  eventType: z.enum(['WEBSITE_CLICK', 'PHONE_CLICK', 'DIRECTIONS_CLICK']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      'anonymous'

    await rateLimit({ identifier: ip, action: `shop-track:${slug}`, maxPerMinute: 3 })

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({}, { status: 200 }) // silent drop

    const shop = await db.shop.findUnique({ where: { slug }, select: { id: true } })
    if (!shop) return NextResponse.json({}, { status: 200 }) // silent drop

    await db.leadEvent.create({
      data: { shopId: shop.id, eventType: parsed.data.eventType },
    })

    return NextResponse.json({}, { status: 200 })
  } catch {
    // Silent drop — never surface errors to client
    return NextResponse.json({}, { status: 200 })
  }
}
```

- [ ] **Step 2: Create the `ShopActionButtons` client component**

`src/modules/shops/components/ShopActionButtons.tsx`:

```typescript
'use client'

type EventType = 'WEBSITE_CLICK' | 'PHONE_CLICK' | 'DIRECTIONS_CLICK'

interface Props {
  shopSlug: string
  phone?: string | null
  websiteUrl?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

function trackEvent(slug: string, eventType: EventType) {
  fetch(`/api/shops/${slug}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType }),
  }).catch(() => {}) // fire-and-forget
}

export function ShopActionButtons({ shopSlug, phone, websiteUrl, address, city, state }: Props) {
  const mapsQuery = [address, city, state].filter(Boolean).join(', ')
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`

  return (
    <div className="flex flex-wrap gap-3">
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={() => trackEvent(shopSlug, 'PHONE_CLICK')}
          className="btn"
        >
          Call
        </a>
      )}
      {mapsQuery && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(shopSlug, 'DIRECTIONS_CLICK')}
          className="btn"
        >
          Get Directions
        </a>
      )}
      {websiteUrl && (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(shopSlug, 'WEBSITE_CLICK')}
          className="btn btn-primary"
        >
          Visit Website
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "track\|ShopAction"
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/shops/\[slug\]/track/route.ts \
        src/modules/shops/components/ShopActionButtons.tsx
git commit -m "feat: add lead tracking API route and ShopActionButtons component"
```

---

## Task 11: Admin Claims Queue + Actions

**Files:**
- Create: `src/modules/shops/actions/adminShops.ts`
- Create: `src/app/admin/shops/claims/page.tsx`

- [ ] **Step 1: Create `adminShops.ts` with all admin actions**

`src/modules/shops/actions/adminShops.ts`:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopStatus, ClaimStatus } from '@/generated/prisma/client'
import { createNotification } from '@/lib/notifications'

export type AdminActionState = { errors: Record<string, string>; success?: boolean }

// ── Claim approval ─────────────────────────────────────────

export async function approveClaim(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin()
    const claimId = formData.get('claimId') as string
    if (!claimId) return { errors: { general: 'Missing claim ID' } }

    const claim = await db.shopClaimRequest.findUnique({
      where: { id: claimId },
      include: { shop: { select: { name: true, slug: true } } },
    })
    if (!claim) return { errors: { general: 'Claim not found' } }

    await db.$transaction([
      db.shopClaimRequest.update({
        where: { id: claimId },
        data: { status: ClaimStatus.APPROVED },
      }),
      db.shop.update({
        where: { id: claim.shopId },
        data: { ownerId: claim.userId, status: ShopStatus.CLAIMED },
      }),
    ])

    await createNotification(
      claim.userId,
      'shop_claim_approved',
      'Claim Approved',
      `Your claim for ${claim.shop.name} has been approved. You are now the owner.`,
      `/shops/${claim.shop.slug}/manage/edit`,
    )

    revalidatePath('/admin/shops/claims')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}

export async function rejectClaim(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin()
    const claimId = formData.get('claimId') as string
    const adminNote = formData.get('adminNote') as string
    if (!claimId) return { errors: { general: 'Missing claim ID' } }

    const claim = await db.shopClaimRequest.findUnique({
      where: { id: claimId },
      include: { shop: { select: { name: true } } },
    })
    if (!claim) return { errors: { general: 'Claim not found' } }

    await db.shopClaimRequest.update({
      where: { id: claimId },
      data: { status: ClaimStatus.REJECTED, adminNote: adminNote || null },
    })

    await createNotification(
      claim.userId,
      'shop_claim_rejected',
      'Claim Rejected',
      `Your claim for ${claim.shop.name} was not approved.${adminNote ? ` Note: ${adminNote}` : ''}`,
    )

    revalidatePath('/admin/shops/claims')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}

// ── Submission approval ─────────────────────────────────────

export async function approveSubmission(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin()
    const shopId = formData.get('shopId') as string
    if (!shopId) return { errors: { general: 'Missing shop ID' } }

    const shop = await db.shop.findUnique({ where: { id: shopId } })
    if (!shop) return { errors: { general: 'Shop not found' } }

    await db.shop.update({
      where: { id: shopId },
      data: { status: ShopStatus.CLAIMED },
    })

    if (shop.submittedByUserId) {
      await createNotification(
        shop.submittedByUserId,
        'shop_submission_approved',
        'Shop Approved',
        `Your submission for ${shop.name} has been approved and is now live.`,
        `/shops/${shop.slug}/manage/edit`,
      )
    }

    revalidatePath('/admin/shops/submissions')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}

export async function rejectSubmission(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin()
    const shopId = formData.get('shopId') as string
    const adminNote = formData.get('adminNote') as string
    if (!shopId) return { errors: { general: 'Missing shop ID' } }

    const shop = await db.shop.findUnique({ where: { id: shopId } })
    if (!shop) return { errors: { general: 'Shop not found' } }

    await db.shop.update({
      where: { id: shopId },
      data: { status: ShopStatus.DRAFT, ownerId: null },
    })

    if (shop.submittedByUserId) {
      await createNotification(
        shop.submittedByUserId,
        'shop_submission_rejected',
        'Shop Not Approved',
        `Your submission for ${shop.name} was not approved.${adminNote ? ` Note: ${adminNote}` : ''} Contact support to resubmit.`,
      )
    }

    revalidatePath('/admin/shops/submissions')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}

// ── Manual owner assignment ─────────────────────────────────

export async function assignShopOwner(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin()
    const shopId = formData.get('shopId') as string
    const userEmail = formData.get('userEmail') as string
    if (!shopId || !userEmail) return { errors: { general: 'Missing required fields' } }

    const user = await db.user.findUnique({ where: { email: userEmail }, select: { id: true } })
    if (!user) return { errors: { general: 'User not found with that email' } }

    await db.shop.update({
      where: { id: shopId },
      data: { ownerId: user.id, status: ShopStatus.CLAIMED },
    })

    revalidatePath('/admin/shops')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}

export async function removeShopOwner(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin()
    const shopId = formData.get('shopId') as string
    if (!shopId) return { errors: { general: 'Missing shop ID' } }

    await db.shop.update({
      where: { id: shopId },
      data: { ownerId: null, status: ShopStatus.ACTIVE },
    })

    revalidatePath('/admin/shops')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
```

- [ ] **Step 2: Create the claims queue page**

`src/app/admin/shops/claims/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/auth/guards'
import { getPendingClaims } from '@/modules/shops/lib/queries'
import { approveClaim, rejectClaim } from '@/modules/shops/actions/adminShops'

export default async function AdminClaimsPage() {
  await requireAdmin()
  const claims = await getPendingClaims()

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold">Shop Claim Requests</h1>

      {claims.length === 0 && (
        <p className="text-[var(--color-text-muted)]">No pending claims.</p>
      )}

      <div className="space-y-4">
        {claims.map((claim) => (
          <div key={claim.id} className="rounded-lg border border-[var(--color-border)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{claim.shop.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {claim.user.name ?? claim.user.email} · {claim.businessRole}
                </p>
                <p className="mt-2 text-sm">{claim.proofDetail}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Submitted {new Date(claim.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={approveClaim}>
                  <input type="hidden" name="claimId" value={claim.id} />
                  <button type="submit" className="btn btn-primary text-sm py-1 px-3">Approve</button>
                </form>
                <form action={rejectClaim} className="flex gap-2">
                  <input type="hidden" name="claimId" value={claim.id} />
                  <input name="adminNote" className="input text-sm py-1 px-2" placeholder="Rejection note (optional)" />
                  <button type="submit" className="btn text-sm py-1 px-3 text-red-500">Reject</button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/shops/actions/adminShops.ts \
        src/app/admin/shops/claims/page.tsx
git commit -m "feat: add admin claim queue and shop admin actions"
```

---

## Task 12: Admin Submissions Queue + Preview

**Files:**
- Create: `src/app/admin/shops/submissions/page.tsx`
- Create: `src/app/admin/shops/preview/[id]/page.tsx`

- [ ] **Step 1: Create the submissions queue page**

`src/app/admin/shops/submissions/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/auth/guards'
import { getPendingSubmissions } from '@/modules/shops/lib/queries'
import { approveSubmission, rejectSubmission } from '@/modules/shops/actions/adminShops'
import Link from 'next/link'

export default async function AdminSubmissionsPage() {
  await requireAdmin()
  const submissions = await getPendingSubmissions()

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold">Pending Shop Submissions</h1>

      {submissions.length === 0 && (
        <p className="text-[var(--color-text-muted)]">No pending submissions.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
              <th className="pb-3 font-medium">Shop</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Location</th>
              <th className="pb-3 font-medium">Submitted By</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {submissions.map((shop) => (
              <tr key={shop.id}>
                <td className="py-3">
                  <Link href={`/admin/shops/preview/${shop.id}`} className="hover:underline text-[var(--color-primary)]">
                    {shop.name}
                  </Link>
                </td>
                <td className="py-3 text-[var(--color-text-muted)]">{shop.shopType.replace(/_/g, ' ')}</td>
                <td className="py-3 text-[var(--color-text-muted)]">{shop.city}, {shop.state}</td>
                <td className="py-3 text-[var(--color-text-muted)]">{shop.submittedBy?.name ?? '—'}</td>
                <td className="py-3 text-[var(--color-text-muted)]">{new Date(shop.createdAt).toLocaleDateString()}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <form action={approveSubmission}>
                      <input type="hidden" name="shopId" value={shop.id} />
                      <button type="submit" className="btn btn-primary text-xs py-1 px-2">Approve</button>
                    </form>
                    <form action={rejectSubmission} className="flex gap-2">
                      <input type="hidden" name="shopId" value={shop.id} />
                      <input name="adminNote" className="input text-xs py-1 px-2 w-32" placeholder="Note" />
                      <button type="submit" className="btn text-xs py-1 px-2 text-red-500">Reject</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the admin preview page**

`src/app/admin/shops/preview/[id]/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { ShopDetail } from '@/modules/shops'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminShopPreviewPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  // Bypasses public status filter — admin can see any status
  const shop = await db.shop.findUnique({
    where: { id },
    include: {
      affiliateLinks: { where: { isActive: true }, select: { slug: true, name: true, url: true } },
    },
  })

  if (!shop) notFound()

  const reviews = await db.shopReview.findMany({
    where: { shopId: shop.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Map to ShopDetailData shape
  const shopData = {
    id: shop.id,
    ownerId: shop.ownerId,
    name: shop.name,
    slug: shop.slug,
    description: shop.description,
    address: shop.address,
    city: shop.city,
    state: shop.state,
    zipCode: shop.zipCode,
    country: shop.country,
    phone: shop.phone,
    email: shop.email,
    websiteUrl: shop.websiteUrl,
    latitude: shop.latitude,
    longitude: shop.longitude,
    imageUrl: shop.imageUrl,
    services: Array.isArray(shop.services) ? (shop.services as string[]) : [],
    brands: Array.isArray(shop.brands) ? (shop.brands as string[]) : [],
    hoursJson: shop.hoursJson ?? undefined,
    avgOverallRating: shop.avgOverallRating,
    avgServiceRating: shop.avgServiceRating,
    avgPricingRating: shop.avgPricingRating,
    avgSelectionRating: shop.avgSelectionRating,
    reviewCount: shop.reviewCount,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    affiliateLinks: undefined,
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 rounded bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
        <strong>Admin Preview</strong> — This shop is not publicly visible (status: {shop.status})
      </div>
      <ShopDetail shop={shopData} reviews={reviews} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/shops/submissions/page.tsx \
        src/app/admin/shops/preview/
git commit -m "feat: add admin submissions queue and shop preview page"
```

---

## Task 13: Admin Shops Index + Detail

**Files:**
- Create: `src/app/admin/shops/page.tsx`
- Create: `src/app/admin/shops/[id]/page.tsx`

- [ ] **Step 1: Create the admin shops index**

`src/app/admin/shops/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import Link from 'next/link'

export default async function AdminShopsPage() {
  await requireAdmin()

  const shops = await db.shop.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      shopType: true,
      city: true,
      state: true,
      owner: { select: { name: true, email: true } },
    },
    orderBy: { name: 'asc' },
    take: 100,
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">All Shops ({shops.length})</h1>
        <div className="flex gap-3">
          <Link href="/admin/shops/claims" className="btn text-sm">Claims</Link>
          <Link href="/admin/shops/submissions" className="btn text-sm">Submissions</Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Location</th>
              <th className="pb-3 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td className="py-3">
                  <Link href={`/admin/shops/${shop.id}`} className="hover:underline text-[var(--color-primary)]">
                    {shop.name}
                  </Link>
                </td>
                <td className="py-3">
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--color-surface-raised)]">
                    {shop.status}
                  </span>
                </td>
                <td className="py-3 text-[var(--color-text-muted)]">{shop.shopType.replace(/_/g, ' ')}</td>
                <td className="py-3 text-[var(--color-text-muted)]">{shop.city}, {shop.state}</td>
                <td className="py-3 text-[var(--color-text-muted)]">{shop.owner?.name ?? shop.owner?.email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the admin shop detail page**

`src/app/admin/shops/[id]/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { assignShopOwner, removeShopOwner } from '@/modules/shops/actions/adminShops'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminShopDetailPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const shop = await db.shop.findUnique({
    where: { id },
    include: { owner: { select: { name: true, email: true } } },
  })

  if (!shop) notFound()

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-4">
        <Link href="/admin/shops" className="text-sm text-[var(--color-text-muted)] hover:underline">← All Shops</Link>
      </div>

      <h1 className="mb-1 text-xl font-bold">{shop.name}</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        {shop.city}, {shop.state} · Status: {shop.status}
      </p>

      {/* Current Owner */}
      <div className="mb-8 rounded-lg border border-[var(--color-border)] p-4">
        <h2 className="font-medium mb-2">Owner</h2>
        {shop.owner ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{shop.owner.name ?? 'No name'}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{shop.owner.email}</p>
            </div>
            <form action={removeShopOwner}>
              <input type="hidden" name="shopId" value={shop.id} />
              <button type="submit" className="btn text-sm text-red-500">Remove Owner</button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">No owner assigned</p>
        )}
      </div>

      {/* Assign Owner */}
      <div className="rounded-lg border border-[var(--color-border)] p-4">
        <h2 className="font-medium mb-3">Assign Owner by Email</h2>
        <form action={assignShopOwner} className="flex gap-3">
          <input type="hidden" name="shopId" value={shop.id} />
          <input
            name="userEmail"
            type="email"
            className="input flex-1"
            placeholder="user@example.com"
            required
          />
          <button type="submit" className="btn btn-primary">Assign</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/shops/page.tsx \
        src/app/admin/shops/\[id\]/page.tsx
git commit -m "feat: add admin shops index and manual owner assignment page"
```

---

## Task 14: Modify Public Shop Detail Page

**Files:**
- Modify: `src/app/shops/[slug]/page.tsx`

This task wires the two public-facing changes from the spec into the existing shop detail page:
1. Add "Claim this listing" link when `shop.ownerId === null`
2. Swap hard-coded CTA buttons for the new `ShopActionButtons` client component

- [ ] **Step 1: Read the existing page**

Read `src/app/shops/[slug]/page.tsx` to understand the current structure (already read at start of plan).

The current `ShopPage` renders `<ShopDetail shop={shop} reviews={reviews} />`. The `ShopDetail` component internally renders the call/directions/website buttons. Per the spec, we extract those into `ShopActionButtons` and add the claim link directly in the page.

However, `ShopDetail` is an existing module component — modifying it to accept `ShopActionButtons` externally is out of scope here. The simplest correct approach is to add the claim link and the action buttons directly to the page, after the `ShopDetail` block, so they appear in a known location without touching the existing component internals.

Actually, re-reading the spec: "The existing `ShopDetail` component's 'Call', 'Get Directions', and 'Visit Website' buttons are extracted into a new client component `ShopActionButtons`." This means we must also remove those buttons from `ShopDetail`. Let's check what's inside `ShopDetail` first.

- [ ] **Step 2: Read `ShopDetail` to understand button location**

```bash
grep -n "Call\|Get Directions\|Visit Website\|phone\|websiteUrl" /Users/kylewarner/Documents/ride-mtb/src/modules/shops/components/ShopDetail.tsx | head -20
```

Then read the relevant lines to understand how to extract the buttons. The approach:
- Remove the inline CTA link tags from `ShopDetail`
- Pass the `shopSlug`, `phone`, `websiteUrl`, `address`, `city`, `state` as props to `ShopActionButtons` from the page

- [ ] **Step 3: Add the claim link and `ShopActionButtons` to the shop detail page**

In `src/app/shops/[slug]/page.tsx`, add imports and modify the return:

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { ShopDetail } from '@/modules/shops'
import { ShopActionButtons } from '@/modules/shops/components/ShopActionButtons'
// eslint-disable-next-line no-restricted-imports
import { getShopBySlug, getShopReviews } from '@/modules/shops/lib/queries'

// ... existing generateMetadata unchanged ...

export default async function ShopPage({ params }: ShopPageProps) {
  const { slug } = await params
  const [shop, session] = await Promise.all([getShopBySlug(slug), auth()])
  const reviews = shop ? await getShopReviews(shop.id) : []

  if (!shop) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/shops"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shops
      </Link>

      {/* Claim link — only shown when shop has no owner and user is signed in */}
      {!shop.ownerId && session?.user && (
        <div className="mb-4">
          <Link
            href={`/shops/${slug}/claim`}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Is this your shop? Claim this listing →
          </Link>
        </div>
      )}

      <ShopDetail shop={shop} reviews={reviews} />

      {/* Action buttons with lead tracking */}
      <div className="mt-6">
        <ShopActionButtons
          shopSlug={slug}
          phone={shop.phone}
          websiteUrl={shop.websiteUrl}
          address={shop.address}
          city={shop.city}
          state={shop.state}
        />
      </div>
    </div>
  )
}
```

Note: If `ShopDetail` already renders call/directions/website buttons internally, those should be removed or made conditional via a prop. Check during implementation and add `hideCTAs` prop to `ShopDetail` if needed, or simply accept that both render until a separate cleanup task.

- [ ] **Step 4: Type-check the full project**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors, or only pre-existing errors unrelated to this feature.

- [ ] **Step 5: Commit**

```bash
git add src/app/shops/\[slug\]/page.tsx
git commit -m "feat: add claim link and ShopActionButtons to public shop detail page"
```

---

## Final Verification

- [ ] **Run full TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit 2>&1 | head -50
```

Expected: Zero new errors introduced by this feature.

- [ ] **Verify migration is applied**

```bash
npx prisma migrate status
```

Expected: All migrations applied.

- [ ] **Manual smoke tests** (run the dev server and verify)

```bash
npm run dev
```

- Navigate to `/shops/[slug]` for a shop with no owner — confirm "Claim this listing" link appears
- Navigate to `/shops/submit` — confirm 4-step form renders
- Navigate to `/shops/[slug]/manage/edit` as non-owner — confirm redirect to `/403`
- Navigate to `/admin/shops/claims` as admin — confirm page loads
- Navigate to `/admin/shops/submissions` as admin — confirm page loads

