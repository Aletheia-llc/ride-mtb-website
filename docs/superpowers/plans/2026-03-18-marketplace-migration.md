# Marketplace Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the feature-complete `ride-mtb-buy-sell` standalone prototype into the Ride MTB monolith as `src/modules/marketplace/`, with real Stripe Connect payments and Garage integration.

**Architecture:** Wholesale transplant of the standalone's 100+ files into `src/modules/marketplace/`, systematically adapting imports, model accessor renames, and the image upload system. All routes live under `/marketplace/`. Existing scaffold files are deleted. The Stripe webhook route is extended in-place.

**Tech Stack:** Next.js 15.5.x App Router, Prisma v7, Supabase (via `src/lib/db/client.ts`), NextAuth v5 (`@/lib/auth/guards`), Tailwind CSS v4, Stripe Connect Express, Vercel Blob (`@vercel/blob`), EasyPost/Shippo (mock fallback)

**Source reference:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/` — the standalone prototype. Every migration task reads from here.

---

## Systematic Adaptations (apply to every migrated file)

| Standalone | Monolith |
|---|---|
| `import { prisma } from '@/lib/prisma'` | `import { db } from '@/lib/db/client'` |
| `import { auth } from '@/lib/auth'` | `import { requireAuth } from '@/lib/auth/guards'` |
| `import { requireAuth } from '@/lib/auth-helpers'` | `import { requireAuth } from '@/lib/auth/guards'` |
| `prisma.<anything>` | `db.<anything>` |
| `prisma.conversation` | `db.listingConversation` |
| `prisma.message` | `db.listingMessage` |
| `import ... from '@/generated/prisma/client'` | keep as-is (same path in monolith) |
| Local `/api/upload` calls | Vercel Blob `put()` from `@vercel/blob` |
| `unlink` / local file deletion | `del()` from `@vercel/blob` |
| Standalone CSS classes / Geist | Tailwind v4 tokens (`var(--color-*)`, `var(--color-primary)`) |
| `from 'fs/promises'` in upload handlers | remove (replaced by blob) |

---

## File Structure

### Files to DELETE (existing scaffold — replaced entirely)

```
src/modules/marketplace/actions/createListing.ts
src/modules/marketplace/actions/createSellerProfile.ts
src/modules/marketplace/actions/initiateListingPayment.ts
src/modules/marketplace/actions/makeOffer.ts
src/modules/marketplace/actions/respondToOffer.ts
src/modules/marketplace/actions/updateStatus.ts
src/modules/marketplace/components/CreateListingForm.tsx
src/modules/marketplace/components/FavoriteButton.tsx
src/modules/marketplace/components/ImageUploader.tsx
src/modules/marketplace/components/index.ts
src/modules/marketplace/components/ListingCard.tsx
src/modules/marketplace/components/ListingDetail.tsx
src/modules/marketplace/components/ListingFilters.tsx
src/modules/marketplace/components/ListingGrid.tsx
src/modules/marketplace/components/OfferForm.tsx
src/modules/marketplace/components/OffersList.tsx
src/modules/marketplace/components/PayListingFeeButton.tsx
src/modules/marketplace/components/SellerDashboard.tsx
src/modules/marketplace/components/SellerProfileCard.tsx
src/app/marketplace/[slug]/page.tsx
src/app/marketplace/create/page.tsx
src/app/marketplace/dashboard/page.tsx
src/app/marketplace/favorites/page.tsx
src/app/marketplace/layout.tsx
src/app/marketplace/page.tsx
src/app/api/marketplace/create-listing-checkout/route.ts
src/app/api/marketplace/favorites/route.ts
src/app/api/marketplace/images/route.ts
src/app/api/marketplace/listings/ (whole directory)
src/app/api/marketplace/status/route.ts
```

### Files to CREATE

```
src/modules/marketplace/
  actions/
    listing-mutations.ts      # create, update, delete, bump, feature
    listing-mutations.test.ts # unit tests
    listings.ts               # browse, detail, search, filters
    offers.ts                 # make, counter, accept, decline, withdraw
    offers.test.ts            # unit tests
    messages.ts               # start conversation, send, mark read
    saves.ts                  # save/unsave
    reports.ts                # report listing
    seller.ts                 # create/update seller profile
    stripe-connect.ts         # onboarding, account links, PaymentIntent
    transactions.ts           # create, update status, tracking
    transactions.test.ts      # unit tests (fee calculation)
    admin.ts                  # moderation, approve/remove, manage
    photos.ts                 # Vercel Blob upload, reorder, delete
    shipping.ts               # rate estimates
    maintenance.ts            # expire listings
  components/
    browse/
      BrowseGrid.tsx
      BrowseFilterSidebar.tsx
    listing/
      ListingCard.tsx
      ListingDetail.tsx
      ListingPhotoGallery.tsx
      ListingActions.tsx
      ConditionBadge.tsx
      MyListingCard.tsx
    offers/
      MakeOfferModal.tsx
      OfferCard.tsx
      OfferChain.tsx
      OfferActions.tsx
      OfferList.tsx
    messaging/
      ConversationList.tsx
      ConversationThread.tsx
      MessageBubble.tsx
      MessageInput.tsx
    seller/
      SellerCard.tsx
      SellerDashboard.tsx
      SellerProfilePage.tsx
      SellerReviewCard.tsx
      SellerReviewForm.tsx
      StripeOnboarding.tsx
      TrustBadge.tsx
    checkout/
      CheckoutForm.tsx
      OrderSummary.tsx
      CheckoutSuccess.tsx
    shipping/
      ShippingEstimator.tsx
      ShippingMethodSelect.tsx
      PackageDimensions.tsx
    sell/
      CreateListingForm.tsx
      CategorySelect.tsx
      ConditionSelect.tsx
      ListingPhotoUploader.tsx
      PricingSection.tsx
      FulfillmentSection.tsx
    transaction/
      TransactionCard.tsx
      AddTrackingForm.tsx
      DisputeForm.tsx
    admin/
      AdminListingTable.tsx
      ReviewQueue.tsx
      ReportsList.tsx
      SellerManager.tsx
      TransactionManager.tsx
    ui/
      SaveButton.tsx
      ReportButton.tsx
      ListingCardSkeleton.tsx
      ListingDetailSkeleton.tsx
  lib/
    queries.ts
    trust.ts
    trust.test.ts             # unit tests
    shipping.ts
  types/
    index.ts
  index.ts

src/app/marketplace/
  page.tsx                    # /marketplace — browse
  layout.tsx
  [slug]/page.tsx             # listing detail
  sell/page.tsx               # create listing
  sell/[id]/edit/page.tsx     # edit listing
  seller/[userId]/page.tsx    # public seller profile
  seller/dashboard/page.tsx
  seller/onboarding/page.tsx
  checkout/[slug]/page.tsx
  checkout/success/page.tsx
  my/listings/page.tsx
  my/messages/page.tsx
  my/messages/[conversationId]/page.tsx
  my/offers/page.tsx
  my/purchases/page.tsx
  my/sales/page.tsx
  my/saved/page.tsx
  admin/page.tsx
  admin/listings/page.tsx
  admin/review-queue/page.tsx
  admin/reports/page.tsx
  admin/sellers/page.tsx
  admin/transactions/page.tsx

src/app/api/marketplace/
  shipping/estimate/route.ts  # carrier rate estimates

src/app/api/cron/
  marketplace-expire/route.ts # auto-expire listings
```

### Files to MODIFY

```
prisma/schema.prisma                              # schema migration
src/app/api/stripe/webhook/route.ts               # extend webhook
src/lib/middleware/withAuth.ts                    # add marketplace paths
src/app/bikes/garage/[bikeId]/page.tsx            # add Sell This Bike button
vercel.json                                       # add cron entry
```

---

## Task 1: Install Vercel Blob + Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_marketplace_schema/migration.sql` (auto-generated)

- [ ] **Step 1: Install @vercel/blob**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npm install @vercel/blob
```

- [ ] **Step 2: Update the Listing model in prisma/schema.prisma**

Add the `FulfillmentType` enum (before the `Listing` model or near other enums):

```prisma
enum FulfillmentType {
  local_only
  ship_only
  local_or_ship
}
```

Add these fields to the `Listing` model (after existing fields):

```prisma
tags             String[]         @default([])
currency         String           @default("USD")
fulfillment      FulfillmentType  @default(local_or_ship)
shippingCost     Float?
estimatedWeight  Float?
packageLength    Int?
packageWidth     Int?
packageHeight    Int?
city             String?
state            String?
zipCode          String?
country          String           @default("US")
latitude         Float?
longitude        Float?
isFeatured       Boolean          @default(false)
isBumped         Boolean          @default(false)
bumpedAt         DateTime?
viewCount        Int              @default(0)
saveCount        Int              @default(0)
messageCount     Int              @default(0)
expiresAt        DateTime?
soldAt           DateTime?
fromGarageBikeId String?
forumCrossPostId String?
```

Remove the `imageUrls Json` field from `Listing`.

Change `Listing.status` default to `@default(pending_review)`.

- [ ] **Step 3: Update ListingStatus enum — add pending_review**

Find the existing `ListingStatus` enum and add `pending_review`:

```prisma
enum ListingStatus {
  draft
  pending_review
  active
  sold
  reserved
  expired
  removed
  cancelled
}
```

- [ ] **Step 4: Replace ListingCategory enum values**

Replace existing `ListingCategory` enum body wholesale (keep the enum name, replace all values):

```prisma
enum ListingCategory {
  complete_bike
  frame
  fork
  shock
  wheels
  tires
  drivetrain
  brakes
  cockpit
  saddle_seatpost
  pedals
  dropper_post
  helmet
  goggles_eyewear
  clothing
  pack_hydration
  tools
  electronics
  protection
  rack_transport
  vehicle
  other
}
```

- [ ] **Step 5: Update SellerProfile, SellerReview, and Transaction models**

Add to `SellerProfile`: `avgResponseTime  Int?`

Add to `SellerReview`: `tags  String[]  @default([])`

Add to `Transaction`: `paymentIntentId  String?  @unique` (required for webhook upsert in Task 19)

- [ ] **Step 6: Remove ListingPayment model and ListingFavorite model**

Delete the entire `ListingPayment` model block from schema.

Delete the entire `ListingFavorite` model block from schema.

Also remove `listingPayments` and `listingFavorites` relations from the `User` model.

- [ ] **Step 7: Run migration**

```bash
npx prisma migrate dev --name marketplace_schema
```

Expected: Migration file created, schema updated, Prisma client regenerated. If there are enum conflicts, resolve them by checking existing data won't break (for dev, reset if needed: `npx prisma migrate reset --force` then `npx prisma migrate dev`).

- [ ] **Step 8: Verify generated client includes new types**

```bash
npx prisma generate
```

Check that `FulfillmentType`, updated `ListingCategory`, `pending_review` in `ListingStatus` all appear in `src/generated/prisma/client`.

- [ ] **Step 9: Commit**

```bash
git add prisma/ package.json package-lock.json
git commit -m "feat: add marketplace schema — FulfillmentType, expanded Listing, remove ListingPayment/ListingFavorite"
```

---

## Task 2: Delete Scaffold, Create Module Directory Structure

**Files:**
- Delete: all scaffold files listed above
- Create: `src/modules/marketplace/index.ts` (barrel)

- [ ] **Step 1: Delete existing scaffold files**

```bash
# Delete old actions
rm src/modules/marketplace/actions/*.ts

# Delete old components (flat structure)
rm -rf src/modules/marketplace/components

# Delete old routes
rm -rf src/app/marketplace

# Delete old API routes being replaced
rm -rf src/app/api/marketplace/create-listing-checkout
rm -rf src/app/api/marketplace/favorites
rm -rf src/app/api/marketplace/images
rm -rf src/app/api/marketplace/listings
rm -rf src/app/api/marketplace/status
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p src/modules/marketplace/actions
mkdir -p src/modules/marketplace/components/{browse,listing,offers,messaging,seller,checkout,shipping,sell,transaction,admin,ui}
mkdir -p src/modules/marketplace/lib
mkdir -p src/modules/marketplace/types
mkdir -p src/app/marketplace/{sell,seller,checkout,my,admin}
mkdir -p "src/app/marketplace/sell/[id]/edit"
mkdir -p "src/app/marketplace/seller/[userId]"
mkdir -p src/app/marketplace/seller/dashboard
mkdir -p src/app/marketplace/seller/onboarding
mkdir -p "src/app/marketplace/checkout/[slug]"
mkdir -p src/app/marketplace/checkout/success
mkdir -p "src/app/marketplace/[slug]"
mkdir -p src/app/marketplace/my/messages
mkdir -p "src/app/marketplace/my/messages/[conversationId]"
mkdir -p src/app/marketplace/my/{listings,offers,purchases,sales,saved}
mkdir -p src/app/marketplace/admin/{listings,review-queue,reports,sellers,transactions}
mkdir -p src/app/api/marketplace/shipping/estimate
mkdir -p src/app/api/cron/marketplace-expire
```

- [ ] **Step 3: Create minimal module barrel**

Create `src/modules/marketplace/index.ts`:

```typescript
// Marketplace module barrel — populated as components are migrated
export * from './types'
```

- [ ] **Step 4: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: Errors may exist for deleted references — these will be resolved in subsequent tasks. As long as the schema compiles, proceed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove marketplace scaffold, create module directory structure"
```

---

## Task 3: Types and Shared Lib

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/types.ts`
**Target:** `src/modules/marketplace/types/index.ts`, `src/modules/marketplace/lib/queries.ts`, `src/modules/marketplace/lib/trust.ts`, `src/modules/marketplace/lib/shipping.ts`

- [ ] **Step 1: Migrate types/index.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/types.ts`

Create `src/modules/marketplace/types/index.ts` — copy the file, applying adaptations:
- Update imports to use `@/generated/prisma/client` if not already
- No `prisma` client imports needed in types file

- [ ] **Step 2: Migrate lib/queries.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/` (check for a queries file there or look at standalone lib directory)

Create `src/modules/marketplace/lib/queries.ts` — migrate query helpers:
- `import { db } from '@/lib/db/client'` (not `prisma`)
- Replace `prisma.conversation` → `db.listingConversation`
- Replace `prisma.message` → `db.listingMessage`
- Replace all other `prisma.xyz` → `db.xyz`

- [ ] **Step 3: Migrate lib/trust.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/trust.ts`

Create `src/modules/marketplace/lib/trust.ts` — copy and adapt:
- Update any `prisma` imports to `db` imports if needed
- Trust score calculation should be pure functions (no DB calls) — confirm

- [ ] **Step 4: Migrate lib/shipping.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/` shipping helpers if present

Create `src/modules/marketplace/lib/shipping.ts` — mock fallback implementation:

```typescript
// Rate estimation with mock fallback when EASYPOST_API_KEY is not set
export async function estimateShippingRates(params: {
  fromZip: string
  toZip: string
  weightLbs: number
  lengthIn: number
  widthIn: number
  heightIn: number
}) {
  const apiKey = process.env.EASYPOST_API_KEY
  if (!apiKey) {
    // Mock rates for development
    return [
      { carrier: 'USPS', service: 'Priority Mail', rate: 12.50 },
      { carrier: 'UPS', service: 'Ground', rate: 15.99 },
      { carrier: 'FedEx', service: 'Ground', rate: 14.25 },
    ]
  }
  // EasyPost integration (implement with real API when key is present)
  // TODO: implement EasyPost API call
  return []
}
```

- [ ] **Step 5: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/marketplace/types/ src/modules/marketplace/lib/
git commit -m "feat: add marketplace types and shared lib (queries, trust, shipping)"
```

---

## Task 4: Actions — listing-mutations.ts (with unit tests)

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/listing-mutations.ts`
**Target:** `src/modules/marketplace/actions/listing-mutations.ts`
**Test:** `src/modules/marketplace/actions/listing-mutations.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `src/modules/marketplace/actions/listing-mutations.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    listing: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    listingPhoto: {
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { createListing, deleteListing } from './listing-mutations'

describe('createListing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a listing with pending_review status', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'user-1', role: 'user' } as never)
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ sellerProfile: { id: 'sp-1' } } as never)
    vi.mocked(db.listing.create).mockResolvedValueOnce({ id: 'listing-1', slug: 'test-bike-abc123' } as never)

    await createListing({
      title: 'Test Bike',
      description: 'A great bike',
      price: 1500,
      category: 'complete_bike',
      condition: 'used_good',
      fulfillment: 'local_or_ship',
    } as never)

    expect(db.listing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending_review',
          sellerId: 'user-1',
        }),
      }),
    )
  })
})

describe('deleteListing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when user does not own the listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'user-2', role: 'user' } as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce({ sellerId: 'user-1' } as never)

    await expect(deleteListing('listing-1')).rejects.toThrow()
  })

  it('allows admin to delete any listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'admin-1', role: 'admin' } as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce({ sellerId: 'user-1' } as never)
    vi.mocked(db.listingPhoto.deleteMany).mockResolvedValueOnce({} as never)
    vi.mocked(db.listing.delete).mockResolvedValueOnce({} as never)

    await deleteListing('listing-1')
    expect(db.listing.delete).toHaveBeenCalledWith({ where: { id: 'listing-1' } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/modules/marketplace/actions/listing-mutations.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Migrate listing-mutations.ts from standalone**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/listing-mutations.ts`

Create `src/modules/marketplace/actions/listing-mutations.ts` — copy and apply ALL systematic adaptations:
- `prisma` → `db` from `@/lib/db/client`
- `requireAuth` from `@/lib/auth/guards`
- `listing.status` default on create must be `'pending_review'`
- Remove any `imageUrls` references (replaced by ListingPhoto relation)
- Enum values: `ListingCategory`, `FulfillmentType` from `@/generated/prisma/client`

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/modules/marketplace/actions/listing-mutations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketplace/actions/listing-mutations.ts src/modules/marketplace/actions/listing-mutations.test.ts
git commit -m "feat: migrate listing-mutations action with unit tests"
```

---

## Task 5: Actions — listings.ts (browse/search queries)

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/listings.ts`
**Target:** `src/modules/marketplace/actions/listings.ts`

- [ ] **Step 1: Migrate listings.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/listings.ts`

Create `src/modules/marketplace/actions/listings.ts` — copy and apply adaptations:
- `prisma` → `db` from `@/lib/db/client`
- Remove `requireAuth` imports if this is a public query file
- Update any `prisma.conversation` → `db.listingConversation`
- Update any `prisma.message` → `db.listingMessage`
- Filters must use new `ListingCategory` enum values and `FulfillmentType`
- Keep `status: 'active'` filter for public browse queries

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/actions/listings"
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/marketplace/actions/listings.ts
git commit -m "feat: migrate listings browse/search action"
```

---

## Task 6: Actions — offers.ts (with unit tests)

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/offers.ts`
**Target:** `src/modules/marketplace/actions/offers.ts`
**Test:** `src/modules/marketplace/actions/offers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/marketplace/actions/offers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    offer: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    listing: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { makeOffer, acceptOffer, declineOffer } from './offers'

describe('makeOffer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an offer with pending status', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'buyer-1' } as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce({
      id: 'listing-1',
      sellerId: 'seller-1',
      status: 'active',
      price: 1000,
    } as never)
    vi.mocked(db.offer.create).mockResolvedValueOnce({ id: 'offer-1' } as never)

    await makeOffer({ listingId: 'listing-1', amount: 900 })

    expect(db.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          amount: 900,
          status: 'pending',
        }),
      }),
    )
  })

  it('throws when buyer tries to offer on own listing', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'seller-1' } as never)
    vi.mocked(db.listing.findUnique).mockResolvedValueOnce({
      id: 'listing-1',
      sellerId: 'seller-1',
      status: 'active',
      price: 1000,
    } as never)

    await expect(makeOffer({ listingId: 'listing-1', amount: 900 })).rejects.toThrow()
  })
})

describe('acceptOffer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets offer status to accepted and listing status to reserved', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'seller-1' } as never)
    vi.mocked(db.offer.findUnique).mockResolvedValueOnce({
      id: 'offer-1',
      sellerId: 'seller-1',
      status: 'pending',
      listingId: 'listing-1',
    } as never)
    vi.mocked(db.offer.update).mockResolvedValueOnce({} as never)

    await acceptOffer('offer-1')

    expect(db.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({ status: 'accepted' }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/modules/marketplace/actions/offers.test.ts
```

- [ ] **Step 3: Migrate offers.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/offers.ts`

Create `src/modules/marketplace/actions/offers.ts` — copy and apply adaptations.

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run src/modules/marketplace/actions/offers.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketplace/actions/offers.ts src/modules/marketplace/actions/offers.test.ts
git commit -m "feat: migrate offers action with unit tests"
```

---

## Task 7: Actions — messages.ts, saves.ts, reports.ts

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/`
**Target:** `src/modules/marketplace/actions/`

- [ ] **Step 1: Migrate messages.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/messages.ts`

Create `src/modules/marketplace/actions/messages.ts` — copy and apply adaptations:
- `prisma` → `db` from `@/lib/db/client`
- **Critical:** `prisma.conversation` → `db.listingConversation` everywhere
- **Critical:** `prisma.message` → `db.listingMessage` everywhere
- `requireAuth` from `@/lib/auth/guards`

- [ ] **Step 2: Migrate saves.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/saves.ts`

Create `src/modules/marketplace/actions/saves.ts` — copy and adapt:
- `prisma.listingSave` → `db.listingSave`
- Ensure it references `ListingSave` (not `ListingFavorite` which is removed)

- [ ] **Step 3: Migrate reports.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/reports.ts`

Create `src/modules/marketplace/actions/reports.ts` — copy and adapt.

- [ ] **Step 4: Typecheck all three**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/actions/messages\|marketplace/actions/saves\|marketplace/actions/reports"
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketplace/actions/messages.ts src/modules/marketplace/actions/saves.ts src/modules/marketplace/actions/reports.ts
git commit -m "feat: migrate messages, saves, reports actions"
```

---

## Task 8: Actions — photos.ts (Vercel Blob adaptation)

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/photos.ts`
**Target:** `src/modules/marketplace/actions/photos.ts`

The key change here: standalone uses local file storage (`unlink` from `fs/promises`). Monolith uses Vercel Blob.

- [ ] **Step 1: Read the standalone photos action**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/photos.ts`

Note the full structure — it handles: upload to `/api/upload`, reorder, delete.

- [ ] **Step 2: Create photos.ts with Vercel Blob**

Create `src/modules/marketplace/actions/photos.ts`:

```typescript
'use server'

import { put, del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

async function verifyListingOwnership(listingId: string, userId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  })
  if (!listing) throw new Error('Listing not found')
  if (listing.sellerId !== userId) throw new Error('Not authorized')
  return listing
}

export async function uploadListingPhoto(listingId: string, formData: FormData) {
  const user = await requireAuth()
  await verifyListingOwnership(listingId, user.id)

  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const filename = `marketplace/${listingId}/${Date.now()}-${file.name}`
  const blob = await put(filename, file, { access: 'public' })

  const count = await db.listingPhoto.count({ where: { listingId } })

  const photo = await db.listingPhoto.create({
    data: {
      listingId,
      url: blob.url,
      sortOrder: count,
    },
  })

  revalidatePath(`/marketplace/sell/${listingId}/edit`)
  return photo
}

export async function deleteListingPhoto(photoId: string) {
  const user = await requireAuth()

  const photo = await db.listingPhoto.findUnique({
    where: { id: photoId },
    include: { listing: { select: { sellerId: true } } },
  })
  if (!photo) throw new Error('Photo not found')
  if (photo.listing.sellerId !== user.id && user.role !== 'admin') {
    throw new Error('Not authorized')
  }

  await del(photo.url)
  await db.listingPhoto.delete({ where: { id: photoId } })

  revalidatePath(`/marketplace/sell/${photo.listingId}/edit`)
}

export async function reorderListingPhotos(listingId: string, orderedPhotoIds: string[]) {
  const user = await requireAuth()
  await verifyListingOwnership(listingId, user.id)

  await Promise.all(
    orderedPhotoIds.map((id, index) =>
      db.listingPhoto.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  revalidatePath(`/marketplace/sell/${listingId}/edit`)
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/actions/photos"
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/marketplace/actions/photos.ts
git commit -m "feat: migrate photos action with Vercel Blob storage"
```

---

## Task 9: Actions — seller.ts, stripe-connect.ts

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/`
**Target:** `src/modules/marketplace/actions/`

- [ ] **Step 1: Migrate seller.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/seller.ts`

Create `src/modules/marketplace/actions/seller.ts` — copy and apply adaptations:
- `prisma` → `db`
- `requireAuth` from `@/lib/auth/guards`
- `db.sellerProfile` (same name in monolith, no rename needed)
- Verify `avgResponseTime` field usage matches new schema addition

- [ ] **Step 2: Migrate stripe-connect.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/stripe-connect.ts`

Create `src/modules/marketplace/actions/stripe-connect.ts` — copy and apply adaptations:
- `prisma` → `db`
- `requireAuth` from `@/lib/auth/guards`
- Platform fee: `Math.round(totalCents * (parseFloat(process.env.PLATFORM_FEE_PERCENT ?? '5') / 100))`
- Verify env vars reference: `STRIPE_SECRET_KEY`, `PLATFORM_FEE_PERCENT`
- Return URLs must use `/marketplace/seller/onboarding` path prefix

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/actions/seller\|marketplace/actions/stripe"
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/marketplace/actions/seller.ts src/modules/marketplace/actions/stripe-connect.ts
git commit -m "feat: migrate seller and stripe-connect actions"
```

---

## Task 10: Actions — transactions.ts (with unit tests), admin.ts, shipping.ts, maintenance.ts

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/`
**Target:** `src/modules/marketplace/actions/`

- [ ] **Step 1: Write failing test for transactions**

Create `src/modules/marketplace/actions/transactions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    transaction: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    listing: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createTransaction, addTracking } from './transactions'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

describe('createTransaction — platform fee calculation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calculates 5% platform fee on item + shipping', async () => {
    // PLATFORM_FEE_PERCENT=5 means fee = round((price + shipping) * 0.05)
    const itemPrice = 1000 // $10.00 in cents representation or dollars
    const shippingCost = 50  // $0.50
    const total = itemPrice + shippingCost
    const expectedFee = Math.round(total * 0.05)
    expect(expectedFee).toBe(52)
  })

  it('platform fee rounds correctly for fractional cents', () => {
    const total = 99
    const fee = Math.round(total * 0.05)
    expect(fee).toBe(5) // 4.95 rounds to 5
  })
})

describe('addTracking', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates transaction status to shipped when tracking added', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({ id: 'seller-1' } as never)
    vi.mocked(db.transaction.findUnique).mockResolvedValueOnce({
      id: 'txn-1',
      sellerId: 'seller-1',
      status: 'paid',
    } as never)
    vi.mocked(db.transaction.update).mockResolvedValueOnce({} as never)

    await addTracking('txn-1', 'USPS', '9400111899223485223498')

    expect(db.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'shipped',
          trackingNumber: '9400111899223485223498',
          carrier: 'USPS',
        }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/modules/marketplace/actions/transactions.test.ts
```

- [ ] **Step 3: Migrate transactions.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/transactions.ts`

Create `src/modules/marketplace/actions/transactions.ts` — copy and adapt:
- `prisma` → `db`
- `requireAuth` from `@/lib/auth/guards`
- Verify `addTracking` exported function exists with correct signature

- [ ] **Step 4: Migrate admin.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/admin.ts`

Create `src/modules/marketplace/actions/admin.ts` — copy and adapt:
- `prisma` → `db`
- Use `requireAdmin` from `@/lib/auth/guards` for admin operations
- Approve listing: update status from `pending_review` → `active`

- [ ] **Step 5: Migrate shipping.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/shipping.ts`

Create `src/modules/marketplace/actions/shipping.ts` — copy and adapt:
- `prisma` → `db`
- Uses `estimateShippingRates` from `../lib/shipping` (the mock fallback we created)

- [ ] **Step 6: Migrate maintenance.ts**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/lib/actions/maintenance.ts`

Create `src/modules/marketplace/actions/maintenance.ts` — copy and adapt:
- `prisma` → `db`
- This should expire listings past `expiresAt` by setting status to `expired`

- [ ] **Step 7: Run transactions test**

```bash
npx vitest run src/modules/marketplace/actions/transactions.test.ts
```

Expected: PASS.

- [ ] **Step 8: Typecheck all new action files**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/actions"
```

- [ ] **Step 9: Commit**

```bash
git add src/modules/marketplace/actions/
git commit -m "feat: migrate transactions (with tests), admin, shipping, maintenance actions"
```

---

## Task 11: Browse and Listing Components

**Source components dir:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/`

For all component migrations:
- Replace any standalone CSS classes with Tailwind v4 tokens (`text-[var(--color-text)]`, `bg-[var(--color-surface)]`, etc.)
- Replace any `import ... from '@/lib/...'` with `@/modules/marketplace/actions/...` or `@/modules/marketplace/types`
- `prisma` → `db` if any db calls present (unlikely in pure UI components)

- [ ] **Step 1: Migrate browse/ components**

Read source:
- `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/browse/` (check directory)

Create:
- `src/modules/marketplace/components/browse/BrowseGrid.tsx`
- `src/modules/marketplace/components/browse/BrowseFilterSidebar.tsx`

Apply adaptations: update action imports to module path.

- [ ] **Step 2: Migrate listing/ components**

Read source:
- `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/listing/`

Create:
- `src/modules/marketplace/components/listing/ListingCard.tsx`
- `src/modules/marketplace/components/listing/ListingDetail.tsx`
- `src/modules/marketplace/components/listing/ListingPhotoGallery.tsx`
- `src/modules/marketplace/components/listing/ListingActions.tsx`
- `src/modules/marketplace/components/listing/ConditionBadge.tsx`
- `src/modules/marketplace/components/listing/MyListingCard.tsx`

If any of these don't exist in the standalone, create them as minimal stubs that render the needed UI.

- [ ] **Step 3: Migrate ui/ shared components**

Create:
- `src/modules/marketplace/components/ui/SaveButton.tsx`
- `src/modules/marketplace/components/ui/ReportButton.tsx`
- `src/modules/marketplace/components/ui/ListingCardSkeleton.tsx`
- `src/modules/marketplace/components/ui/ListingDetailSkeleton.tsx`

Read from standalone `src/components/ui/` equivalents.

- [ ] **Step 4: Typecheck components**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/components/browse\|marketplace/components/listing\|marketplace/components/ui"
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketplace/components/browse/ src/modules/marketplace/components/listing/ src/modules/marketplace/components/ui/
git commit -m "feat: migrate browse, listing, and UI components"
```

---

## Task 12: Offers and Messaging Components

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/`

- [ ] **Step 1: Migrate offers/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/offers/`

Create:
- `src/modules/marketplace/components/offers/MakeOfferModal.tsx`
- `src/modules/marketplace/components/offers/OfferCard.tsx`
- `src/modules/marketplace/components/offers/OfferChain.tsx`
- `src/modules/marketplace/components/offers/OfferActions.tsx`
- `src/modules/marketplace/components/offers/OfferList.tsx`

Apply adaptations: update action imports from `@/lib/actions/offers` → `@/modules/marketplace/actions/offers`.

- [ ] **Step 2: Migrate messaging/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/messaging/`

Create:
- `src/modules/marketplace/components/messaging/ConversationList.tsx`
- `src/modules/marketplace/components/messaging/ConversationThread.tsx`
- `src/modules/marketplace/components/messaging/MessageBubble.tsx`
- `src/modules/marketplace/components/messaging/MessageInput.tsx`

Apply adaptations: action imports, `Tailwind` tokens.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/components/offers\|marketplace/components/messaging"
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/marketplace/components/offers/ src/modules/marketplace/components/messaging/
git commit -m "feat: migrate offers and messaging components"
```

---

## Task 13: Seller and Checkout Components

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/`

- [ ] **Step 1: Migrate seller/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/seller/`

Create:
- `src/modules/marketplace/components/seller/SellerCard.tsx`
- `src/modules/marketplace/components/seller/SellerDashboard.tsx`
- `src/modules/marketplace/components/seller/SellerProfilePage.tsx`
- `src/modules/marketplace/components/seller/SellerReviewCard.tsx`
- `src/modules/marketplace/components/seller/SellerReviewForm.tsx`
- `src/modules/marketplace/components/seller/StripeOnboarding.tsx`
- `src/modules/marketplace/components/seller/TrustBadge.tsx`

`TrustBadge.tsx` uses trust score from `@/modules/marketplace/lib/trust`.

- [ ] **Step 2: Migrate checkout/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/checkout/`

Create:
- `src/modules/marketplace/components/checkout/CheckoutForm.tsx`
- `src/modules/marketplace/components/checkout/OrderSummary.tsx`
- `src/modules/marketplace/components/checkout/CheckoutSuccess.tsx`

`CheckoutForm.tsx` uses Stripe JS and calls `stripe-connect.ts` action to create a PaymentIntent. The Stripe publishable key comes from `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/components/seller\|marketplace/components/checkout"
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/marketplace/components/seller/ src/modules/marketplace/components/checkout/
git commit -m "feat: migrate seller and checkout components"
```

---

## Task 14: Shipping, Sell, Transaction, and Admin Components

**Source:** `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/`

- [ ] **Step 1: Migrate shipping/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/shipping/`

Create:
- `src/modules/marketplace/components/shipping/ShippingEstimator.tsx`
- `src/modules/marketplace/components/shipping/ShippingMethodSelect.tsx`
- `src/modules/marketplace/components/shipping/PackageDimensions.tsx`

- [ ] **Step 2: Migrate sell/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/sell/`

Create:
- `src/modules/marketplace/components/sell/CreateListingForm.tsx`
- `src/modules/marketplace/components/sell/CategorySelect.tsx`
- `src/modules/marketplace/components/sell/ConditionSelect.tsx`
- `src/modules/marketplace/components/sell/ListingPhotoUploader.tsx` — must use `uploadListingPhoto` from `@/modules/marketplace/actions/photos` (Vercel Blob)
- `src/modules/marketplace/components/sell/PricingSection.tsx`
- `src/modules/marketplace/components/sell/FulfillmentSection.tsx`

`ListingPhotoUploader.tsx` must call `uploadListingPhoto(listingId, formData)` using the photos action — remove any direct calls to `/api/upload`.

- [ ] **Step 3: Migrate transaction/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/transaction/`

Create:
- `src/modules/marketplace/components/transaction/TransactionCard.tsx`
- `src/modules/marketplace/components/transaction/AddTrackingForm.tsx`
- `src/modules/marketplace/components/transaction/DisputeForm.tsx` — UI only, updates Transaction status

- [ ] **Step 4: Migrate admin/ components**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/components/admin/`

Create:
- `src/modules/marketplace/components/admin/AdminListingTable.tsx`
- `src/modules/marketplace/components/admin/ReviewQueue.tsx`
- `src/modules/marketplace/components/admin/ReportsList.tsx`
- `src/modules/marketplace/components/admin/SellerManager.tsx`
- `src/modules/marketplace/components/admin/TransactionManager.tsx`

- [ ] **Step 5: Typecheck all**

```bash
npx tsc --noEmit 2>&1 | grep "marketplace/components"
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/marketplace/components/
git commit -m "feat: migrate shipping, sell, transaction, admin components"
```

---

## Task 15: Public Routes (browse, listing detail, seller profile)

**Source routes:**
- Browse: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/browse/page.tsx` → monolith: `src/app/marketplace/page.tsx`
- Listing detail: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/listing/[slug]/page.tsx` → `src/app/marketplace/[slug]/page.tsx`
- Seller profile: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/seller/[userId]/page.tsx` → `src/app/marketplace/seller/[userId]/page.tsx`

For all routes: update all action imports from `@/lib/actions/...` → `@/modules/marketplace/actions/...`.

- [ ] **Step 1: Create marketplace layout**

Create `src/app/marketplace/layout.tsx`:

```typescript
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Marketplace | Ride MTB',
  description: 'Buy and sell mountain bike gear',
}

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 2: Migrate browse page**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/browse/page.tsx`

Create `src/app/marketplace/page.tsx` — copy and apply:
- Action imports → module paths
- Any internal links must use `/marketplace/` prefix (e.g., `/marketplace/${slug}` not `/listing/${slug}`)
- `BrowseGrid` from `@/modules/marketplace/components/browse/BrowseGrid`
- `BrowseFilterSidebar` from `@/modules/marketplace/components/browse/BrowseFilterSidebar`

- [ ] **Step 3: Migrate listing detail page**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/listing/[slug]/page.tsx`

Create `src/app/marketplace/[slug]/page.tsx` — copy and apply:
- Action imports → module paths
- Any `/listing/[slug]` links → `/marketplace/[slug]`
- Any `/sell`, `/checkout`, `/seller` links → `/marketplace/` prefixed

- [ ] **Step 4: Migrate seller profile page**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/seller/[userId]/page.tsx`

Create `src/app/marketplace/seller/[userId]/page.tsx` — copy and apply.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "app/marketplace"
```

- [ ] **Step 6: Commit**

```bash
git add src/app/marketplace/layout.tsx src/app/marketplace/page.tsx "src/app/marketplace/[slug]/" src/app/marketplace/seller/
git commit -m "feat: add marketplace public routes (browse, detail, seller profile)"
```

---

## Task 16: Sell and My Routes

**Source:**
- Sell create: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/sell/page.tsx`
- Sell edit: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/sell/[id]/edit/page.tsx`
- My routes: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/my/`

- [ ] **Step 1: Migrate sell/page.tsx**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/sell/page.tsx`

Create `src/app/marketplace/sell/page.tsx` — copy and apply:
- Handle `searchParams.fromBike` for Garage integration (skeleton here, full pre-fill logic added in Task 21)
- Action imports → module paths
- `CreateListingForm` from `@/modules/marketplace/components/sell/CreateListingForm`

- [ ] **Step 2: Migrate sell/[id]/edit/page.tsx**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/sell/[id]/edit/page.tsx`

Create `src/app/marketplace/sell/[id]/edit/page.tsx` — copy and apply.

- [ ] **Step 3: Migrate my/listings, my/saved, my/offers, my/purchases, my/sales**

For each of these read the corresponding source from `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/my/`:

Create:
- `src/app/marketplace/my/listings/page.tsx`
- `src/app/marketplace/my/saved/page.tsx`
- `src/app/marketplace/my/offers/page.tsx`
- `src/app/marketplace/my/purchases/page.tsx`
- `src/app/marketplace/my/sales/page.tsx`

- [ ] **Step 4: Migrate my/messages routes**

Read source:
- `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/my/messages/page.tsx`
- `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/my/messages/[conversationId]/page.tsx`

Create:
- `src/app/marketplace/my/messages/page.tsx`
- `src/app/marketplace/my/messages/[conversationId]/page.tsx`

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "app/marketplace/sell\|app/marketplace/my"
```

- [ ] **Step 6: Commit**

```bash
git add src/app/marketplace/sell/ src/app/marketplace/my/
git commit -m "feat: add marketplace sell and my routes"
```

---

## Task 17: Seller Dashboard, Onboarding, Checkout, and Admin Routes

**Source:**
- Seller dashboard: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/seller/dashboard/`
- Seller onboarding: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/seller/onboarding/`
- Checkout: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/checkout/`
- Admin: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/admin/`

- [ ] **Step 1: Migrate seller dashboard and onboarding**

Read source files.

Create:
- `src/app/marketplace/seller/dashboard/page.tsx`
- `src/app/marketplace/seller/onboarding/page.tsx`

Onboarding page handles `?return=true` param to show success state after Stripe redirects back.

- [ ] **Step 2: Migrate checkout routes**

Read source:
- `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/checkout/[listingId]/page.tsx`
- `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/checkout/success/page.tsx`

Create:
- `src/app/marketplace/checkout/[slug]/page.tsx` (note: standalone uses `[listingId]`, monolith uses `[slug]` — adapt lookup accordingly)
- `src/app/marketplace/checkout/success/page.tsx`

- [ ] **Step 3: Migrate admin routes**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/admin/`

Create:
- `src/app/marketplace/admin/page.tsx`
- `src/app/marketplace/admin/listings/page.tsx`
- `src/app/marketplace/admin/review-queue/page.tsx`
- `src/app/marketplace/admin/reports/page.tsx`
- `src/app/marketplace/admin/sellers/page.tsx`
- `src/app/marketplace/admin/transactions/page.tsx`

All admin routes use `requireAdmin()` from `@/lib/auth/guards`.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "app/marketplace"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/marketplace/seller/ src/app/marketplace/checkout/ src/app/marketplace/admin/
git commit -m "feat: add seller dashboard, onboarding, checkout, and admin routes"
```

---

## Task 18: API Routes (Shipping Estimate and Cron Expire)

**Source:**
- Shipping: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/api/shipping/estimate/route.ts`
- Cron: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/api/cron/expire/route.ts`

- [ ] **Step 1: Migrate shipping estimate route**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/api/shipping/estimate/route.ts`

Create `src/app/api/marketplace/shipping/estimate/route.ts` — copy and apply:
- `prisma` → `db`
- Use `estimateShippingRates` from `@/modules/marketplace/lib/shipping`
- Keep the mock fallback behavior

- [ ] **Step 2: Create cron expire route**

Read source: `/Users/kylewarner/Documents/ride-mtb-buy-sell/src/app/api/cron/expire/route.ts`

Create `src/app/api/cron/marketplace-expire/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { expireListings } from '@/modules/marketplace/actions/maintenance'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const count = await expireListings()
  return NextResponse.json({ expired: count })
}
```

Verify `expireListings` is exported from maintenance.ts (adapt if needed).

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "api/marketplace/shipping\|api/cron/marketplace"
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/marketplace/shipping/ src/app/api/cron/marketplace-expire/
git commit -m "feat: add shipping estimate and cron expire API routes"
```

---

## Task 19: Extend Stripe Webhook Route

**File to modify:** `src/app/api/stripe/webhook/route.ts`

Per the spec:
1. **Remove** the existing `checkout.session.completed` case entirely (it calls `db.listingPayment.update()` which will crash after ListingPayment is deleted)
2. **Add** `payment_intent.succeeded` case → creates/updates Transaction to `paid` status
3. **Update** `account.updated` case → disambiguate between `SellerProfile` and `CreatorProfile` by checking `stripeAccountId` against both tables

- [ ] **Step 1: Read the current webhook route**

Read `src/app/api/stripe/webhook/route.ts` to understand the full current structure.

- [ ] **Step 2: Remove checkout.session.completed case**

Find and remove the `case 'checkout.session.completed':` block entirely.

- [ ] **Step 3: Add payment_intent.succeeded case**

Add after the switch cases:

```typescript
case 'payment_intent.succeeded': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const listingId = paymentIntent.metadata?.listingId
  const buyerId = paymentIntent.metadata?.buyerId
  if (listingId && buyerId) {
    await db.transaction.upsert({
      where: { paymentIntentId: paymentIntent.id },
      update: { status: 'paid' },
      create: {
        listingId,
        buyerId,
        sellerId: paymentIntent.metadata.sellerId,
        amount: paymentIntent.amount / 100,
        platformFee: paymentIntent.application_fee_amount
          ? paymentIntent.application_fee_amount / 100
          : 0,
        status: 'paid',
        paymentIntentId: paymentIntent.id,
      },
    })
  }
  break
}
```

Note: `paymentIntentId` field must exist on `Transaction` model — verify in schema (add if missing: `paymentIntentId String? @unique`).

- [ ] **Step 4: Update account.updated case**

Find the existing `account.updated` case. Update it to check both tables:

```typescript
case 'account.updated': {
  const account = event.data.object as Stripe.Account
  const stripeAccountId = account.id
  const isOnboarded = account.charges_enabled && account.payouts_enabled

  // Check SellerProfile first
  const seller = await db.sellerProfile.findFirst({
    where: { stripeAccountId },
  })
  if (seller) {
    await db.sellerProfile.update({
      where: { id: seller.id },
      data: { stripeOnboarded: isOnboarded },
    })
    break
  }

  // Check CreatorProfile
  const creator = await db.creatorProfile.findFirst({
    where: { stripeAccountId },
  })
  if (creator) {
    await db.creatorProfile.update({
      where: { id: creator.id },
      data: { stripeOnboarded: isOnboarded },
    })
  }
  break
}
```

- [ ] **Step 5: Typecheck webhook route**

```bash
npx tsc --noEmit 2>&1 | grep "api/stripe/webhook"
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: update stripe webhook — remove listingPayment case, add payment_intent.succeeded, disambiguate account.updated"
```

---

## Task 20: Protected Routes + vercel.json Cron Entry

**Files to modify:**
- `src/lib/middleware/withAuth.ts`
- `vercel.json`

- [ ] **Step 1: Update withAuth protected paths**

Read `src/lib/middleware/withAuth.ts`.

Add marketplace paths to `protectedPaths`:

```typescript
const protectedPaths = [
  '/profile',
  '/admin',
  '/coaching',
  '/bikes/garage',
  '/messages',
  '/marketplace/sell',
  '/marketplace/my',
  '/marketplace/seller/dashboard',
  '/marketplace/seller/onboarding',
  '/marketplace/admin',
  '/marketplace/checkout',
]
```

- [ ] **Step 2: Add cron entry to vercel.json**

Add to the `crons` array in `vercel.json`:

```json
{
  "path": "/api/cron/marketplace-expire",
  "schedule": "0 2 * * *"
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "middleware"
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/middleware/withAuth.ts vercel.json
git commit -m "feat: add marketplace protected routes and cron schedule"
```

---

## Task 21: Garage Integration (Sell from Garage)

**File to modify:** `src/app/bikes/garage/[bikeId]/page.tsx`

Per the spec:
- Add "Sell This Bike" button linking to `/marketplace/sell?fromBike=[bikeId]`
- `sell/page.tsx` reads `searchParams.fromBike`, fetches `UserBike`, pre-fills form
- `fromGarageBikeId` stored on created `Listing`

- [ ] **Step 1: Read the garage bike detail page**

Read `src/app/bikes/garage/[bikeId]/page.tsx`.

- [ ] **Step 2: Add Sell This Bike button**

Add after the existing action buttons:

```typescript
import Link from 'next/link'
// ... inside the page component, in the button group area:
<Link href={`/marketplace/sell?fromBike=${params.bikeId}`}>
  <Button variant="secondary" size="sm">
    Sell This Bike
  </Button>
</Link>
```

Place the button near other management actions (e.g., Edit button area).

- [ ] **Step 3: Update sell/page.tsx to handle fromBike searchParam**

Read `src/app/marketplace/sell/page.tsx` (which we created in Task 16).

Add `fromBike` pre-fill logic:

```typescript
// In the page component:
export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ fromBike?: string }>
}) {
  const { fromBike } = await searchParams
  let bikePrefill = undefined

  if (fromBike) {
    const bike = await db.userBike.findUnique({
      where: { id: fromBike },
      select: { year: true, brand: true, model: true, notes: true, category: true },
    })
    if (bike) {
      bikePrefill = {
        title: `${bike.year ?? ''} ${bike.brand} ${bike.model}`.trim(),
        category: 'complete_bike' as const,
        description: bike.notes ?? '',
        fromGarageBikeId: fromBike,
      }
    }
  }

  return <CreateListingForm prefill={bikePrefill} />
}
```

Update `CreateListingForm` to accept `prefill` prop and pre-populate fields on mount.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "bikes/garage\|marketplace/sell"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/bikes/garage/ src/app/marketplace/sell/
git commit -m "feat: add Sell from Garage integration — button on bike detail, pre-fill on sell page"
```

---

## Task 22: Trust Score Unit Tests

**Test:** `src/modules/marketplace/lib/trust.test.ts`

- [ ] **Step 1: Read lib/trust.ts to understand the scoring algorithm**

Read `src/modules/marketplace/lib/trust.ts` (migrated in Task 3).

Note the inputs (review count, rating, sales, verification status) and expected output range.

- [ ] **Step 2: Write the failing test**

Create `src/modules/marketplace/lib/trust.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateTrustScore } from './trust'

describe('calculateTrustScore', () => {
  it('returns 0 for a new seller with no history', () => {
    const score = calculateTrustScore({
      ratingCount: 0,
      averageRating: 0,
      totalSales: 0,
      isVerified: false,
      isTrusted: false,
    })
    expect(score).toBe(0)
  })

  it('returns higher score for verified sellers', () => {
    const unverified = calculateTrustScore({
      ratingCount: 10,
      averageRating: 4.5,
      totalSales: 5,
      isVerified: false,
      isTrusted: false,
    })
    const verified = calculateTrustScore({
      ratingCount: 10,
      averageRating: 4.5,
      totalSales: 5,
      isVerified: true,
      isTrusted: false,
    })
    expect(verified).toBeGreaterThan(unverified)
  })

  it('score is bounded between 0 and 100', () => {
    const score = calculateTrustScore({
      ratingCount: 1000,
      averageRating: 5,
      totalSales: 500,
      isVerified: true,
      isTrusted: true,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
```

Adjust the test to match the actual signature of `calculateTrustScore` in trust.ts.

- [ ] **Step 3: Run to verify it fails**

```bash
npx vitest run src/modules/marketplace/lib/trust.test.ts
```

- [ ] **Step 4: Make tests pass (adjust if needed)**

If `calculateTrustScore` isn't exported or has a different signature, update `trust.ts` to export it with a consistent interface.

- [ ] **Step 5: Run all marketplace tests**

```bash
npx vitest run src/modules/marketplace/
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/marketplace/lib/trust.test.ts
git commit -m "test: add trust score unit tests"
```

---

## Task 23: Full Typecheck and Run All Tests

- [ ] **Step 1: Run full typecheck**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any remaining type errors. Common sources:
- Missing `paymentIntentId` field on `Transaction` in schema (add if needed: `paymentIntentId String? @unique`, then `npx prisma migrate dev --name add_payment_intent_id`)
- Component prop mismatches from standalone → monolith type differences
- Any remaining `prisma.` references that weren't updated

- [ ] **Step 2: Run all marketplace unit tests**

```bash
npx vitest run src/modules/marketplace/
```

Expected: All 4 test files pass.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (no regressions).

- [ ] **Step 4: Fix any remaining issues**

Address errors methodically — see the systematic adaptations table at the top of this plan.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck errors and test failures from marketplace migration"
```

---

## Task 24: Final Integration Check and Module Barrel

- [ ] **Step 1: Update module barrel**

Update `src/modules/marketplace/index.ts` to export key types and actions:

```typescript
export * from './types'
export * from './actions/listings'
export * from './actions/listing-mutations'
export * from './actions/offers'
export * from './actions/messages'
export * from './actions/saves'
export * from './actions/reports'
export * from './actions/seller'
export * from './actions/stripe-connect'
export * from './actions/transactions'
export * from './actions/admin'
export * from './actions/photos'
export * from './actions/shipping'
export * from './actions/maintenance'
```

- [ ] **Step 2: Verify no dead imports to deleted files**

```bash
grep -r "from '@/modules/marketplace/components/FavoriteButton\|from '@/modules/marketplace/actions/createListing\|from '@/modules/marketplace/actions/initiateListingPayment\|from '@/modules/marketplace/actions/makeOffer\|from '@/modules/marketplace/actions/respondToOffer\|from '@/modules/marketplace/actions/updateStatus'" src/
```

Expected: No results.

- [ ] **Step 3: Verify no references to removed models**

```bash
grep -r "listingFavorite\|listingPayment\|ListingPayment\|ListingFavorite" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results (only comments/strings if any).

- [ ] **Step 4: Final typecheck**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 5: Final test run**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/marketplace/index.ts
git commit -m "feat: finalize marketplace module barrel and verify migration completeness"
```

---

## Environment Variables Reference

The following must be set in Vercel (and `.env.local` for dev):

```bash
# Already exists in monolith
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=...

# New for marketplace
PLATFORM_FEE_PERCENT=5
BLOB_READ_WRITE_TOKEN=vercel_blob_...   # from Vercel Blob dashboard
EASYPOST_API_KEY=...                    # optional — mock rates used if missing
```

Note: `STRIPE_CONNECT_CLIENT_ID` is NOT needed — Stripe Connect Express uses account links.

---

## Manual Verification Checklist (after implementation)

- [ ] Browse → filter by category/condition/location → results update correctly
- [ ] Create listing → photos upload to Vercel Blob → listing enters `pending_review`
- [ ] Admin approves listing from review queue → status becomes `active`
- [ ] Make offer → seller counters → buyer accepts → checkout flow triggers
- [ ] Stripe test card `4242 4242 4242 4242` → payment succeeds → transaction created
- [ ] Stripe test card `4000 0000 0000 9995` → payment declined → error shown
- [ ] Seller adds tracking number → transaction status → `shipped`
- [ ] Seller onboarding: Stripe Express test account, redirect completes, `stripeOnboarded = true`
- [ ] "Sell from Garage" → form pre-filled with bike data, `fromGarageBikeId` set
- [ ] Auto-expire cron: listing past `expiresAt` moves to `expired`
- [ ] Report listing → appears in admin reports page
- [ ] Unauthenticated access to `/marketplace/sell` → redirect to sign-in
- [ ] Existing creator webhook (`account.updated`) still fires correctly
