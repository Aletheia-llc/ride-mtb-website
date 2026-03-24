# Marketplace (Buy/Sell) Migration Design

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Migrate the feature-complete `ride-mtb-buy-sell` standalone prototype into the Ride MTB monolith as `src/modules/marketplace/`, with real Stripe Connect payments and Garage integration.

**Architecture:** Wholesale transplant of the standalone's 100+ files into the monolith module structure, with systematic adaptation of imports, patterns, and naming conventions. All routes live under `/marketplace/`. Stripe Connect Express handles managed payments for shipped transactions (5% platform fee). Local pickup transactions are off-platform.

**Tech Stack:** Next.js 15.5.x App Router, Prisma v7, Supabase (via `src/lib/db/client.ts`), NextAuth v5, Tailwind CSS v4, Stripe Connect Express, Vercel Blob (image uploads), EasyPost/Shippo (shipping estimates, mock fallback)

---

## Systematic Adaptations

Every file migrated from the standalone must apply these changes:

| Standalone | Monolith |
|---|---|
| `import { prisma } from '@/lib/prisma'` | `import { db } from '@/lib/db/client'` |
| `requireAuth()` from `@/lib/auth-helpers` | `requireAuth()` from `@/lib/auth/guards` |
| `/api/upload` route + local storage | Vercel Blob (`@vercel/blob`) |
| Standalone CSS / Geist defaults | Tailwind v4 tokens (`var(--color-*)`, `var(--color-primary)`) |

**Prisma model accessor renames** (schema-level, not just a variable rename — update every `prisma.conversation` and `prisma.message` call):

| Standalone accessor | Monolith accessor |
|---|---|
| `prisma.conversation` | `db.listingConversation` |
| `prisma.message` | `db.listingMessage` |

All other model accessors (`db.listing`, `db.offer`, `db.transaction`, `db.sellerProfile`, etc.) are unchanged.

---

## Schema Changes

### Fields to ADD to `Listing` model

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
fromGarageBikeId String?          // UserBike.id — set when listed via "Sell from Garage"
forumCrossPostId String?          // Post.id — future cross-post feature
```

### Fields to REMOVE from `Listing` model
- `imageUrls Json` — replaced by the existing `ListingPhoto` relation

### New enum
```prisma
enum FulfillmentType {
  local_only
  ship_only
  local_or_ship
}
```

### `ListingStatus` enum — add missing value
Add `pending_review` to the existing enum. New listings default to `pending_review` (not `active`) — they require admin approval before going live:
```prisma
enum ListingStatus {
  draft
  pending_review   // ← add this
  active
  sold
  reserved
  expired
  removed
  cancelled
}
```
Update `Listing.status` default: `@default(pending_review)`

### `ListingCategory` enum — full replacement

This is a **wholesale replacement** of the existing enum values. The current monolith values (`complete_bikes`, `frames`, `suspension`, `accessories`, etc.) are replaced with the standalone's more granular set. A data migration is required for any existing listings — map old values to the closest new equivalent before deploying.

Remove existing values and replace with:
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

All existing code that references `ListingCategory` values — including `src/modules/marketplace/actions/createListing.ts`, browse filter UI, and any Zod schemas — must be updated to use the new values.

### Fields to ADD to `SellerProfile`
```prisma
avgResponseTime  Int?
```

### Fields to ADD to `SellerReview`
```prisma
tags  String[]  @default([])
```

### Models to REMOVE

**`ListingPayment`** — replaced by Stripe Connect. Before removing:
- Update `src/app/api/stripe/webhook/route.ts` — the existing `checkout.session.completed` case calls `db.listingPayment.update(...)`. This must be replaced with `db.transaction.update(...)` using the new Stripe Connect flow.
- Remove `listingPayments` relation from `User` model.

**`ListingFavorite`** — replaced by `ListingSave` (already exists). Before removing:
- Update `src/app/marketplace/page.tsx`
- Update `src/app/marketplace/[slug]/page.tsx`
- Update `src/app/api/marketplace/favorites/route.ts` (replace with saves action)
- Update `src/modules/marketplace/lib/queries.ts`
- Remove `listingFavorites` relation from `User` model.

---

## Module Structure

```
src/modules/marketplace/
  actions/
    listing-mutations.ts   # create, update, delete, bump, feature
    listings.ts            # browse queries, detail, search, filters
    offers.ts              # make, accept, decline, counter, withdraw
    messages.ts            # start conversation, send message, mark read
    saves.ts               # save/unsave listing
    reports.ts             # report listing
    seller.ts              # create/update seller profile
    stripe-connect.ts      # onboarding, account links, PaymentIntent creation
    transactions.ts        # create, update status, add tracking
    admin.ts               # moderation, approve/remove listings, manage sellers
    photos.ts              # upload via Vercel Blob, reorder, delete
    shipping.ts            # rate estimates (mock fallback if no EASYPOST_API_KEY)
    maintenance.ts         # expire listings
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
      DisputeForm.tsx         # UI only — no separate Dispute model, disputes are a Transaction status
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
    shipping.ts
  types/
    index.ts
  index.ts
```

---

## Route Structure

All routes nested under `src/app/marketplace/`:

```
page.tsx                              # /marketplace — browse listings
[slug]/page.tsx                       # /marketplace/[slug] — listing detail
sell/page.tsx                         # /marketplace/sell — create listing
sell/[id]/edit/page.tsx               # /marketplace/sell/[id]/edit
seller/[userId]/page.tsx              # /marketplace/seller/[userId] — public profile
seller/dashboard/page.tsx             # /marketplace/seller/dashboard
seller/onboarding/page.tsx            # /marketplace/seller/onboarding (Stripe)
checkout/[slug]/page.tsx              # /marketplace/checkout/[slug]
checkout/success/page.tsx             # /marketplace/checkout/success
my/listings/page.tsx                  # /marketplace/my/listings
my/messages/page.tsx                  # /marketplace/my/messages
my/messages/[conversationId]/page.tsx # /marketplace/my/messages/[id]
my/offers/page.tsx                    # /marketplace/my/offers
my/purchases/page.tsx                 # /marketplace/my/purchases
my/sales/page.tsx                     # /marketplace/my/sales
my/saved/page.tsx                     # /marketplace/my/saved
admin/page.tsx                        # /marketplace/admin
admin/listings/page.tsx
admin/review-queue/page.tsx
admin/reports/page.tsx
admin/sellers/page.tsx
admin/transactions/page.tsx
```

API routes:
```
src/app/api/marketplace/
  shipping/estimate/route.ts   # carrier rate estimates

src/app/api/cron/
  marketplace-expire/route.ts  # auto-expire old listings
                               # follows project convention: CRON_SECRET bearer auth
                               # add to vercel.json: { "path": "/api/cron/marketplace-expire", "schedule": "0 2 * * *" }
```

**Stripe webhooks:** Handled by extending the **existing** `src/app/api/stripe/webhook/route.ts` — do NOT create a separate webhook route. Changes to make:
1. **Remove** the existing `checkout.session.completed` case entirely — it calls `db.listingPayment.update(...)` which will crash once `ListingPayment` is deleted.
2. **Add** a `payment_intent.succeeded` case → creates/updates `Transaction` record to `paid` status.
3. **Update** the `account.updated` case → disambiguate by checking `stripeAccountId` against both `SellerProfile` and `CreatorProfile` tables; update whichever matches.

Uses the same `STRIPE_WEBHOOK_SECRET` — no second secret needed.

---

## Stripe Connect Architecture

**Payment flow (shipped items only):**
1. Buyer clicks "Buy Now" or an offer is accepted
2. `CheckoutForm` creates a PaymentIntent via `stripe-connect.ts` on the Ride MTB platform account
3. Stripe charges buyer: item price + shipping
4. `application_fee_amount` = `Math.round(totalCents * (PLATFORM_FEE_PERCENT / 100))` — computed in `stripe-connect.ts` at PaymentIntent creation time
5. Remainder queued for transfer to seller's Connect Express account (`transfer_data.destination`)
6. Stripe webhook `payment_intent.succeeded` → Transaction created (`paid` status)
7. Seller adds tracking number → status → `shipped`
8. After delivery confirmed or 3-day auto-confirm → Stripe Transfer fires → `completed`

**Local pickup:** No Stripe, Transaction stored with `$0` platform fee, status managed manually.

**Seller onboarding flow:**
1. Seller visits `/marketplace/seller/onboarding`
2. `createSellerProfile()` creates `SellerProfile` record
3. `stripe-connect.ts` calls `stripe.accounts.create({ type: 'express' })`
4. `stripe.accountLinks.create(...)` returns a Stripe-hosted onboarding URL
5. Seller completes KYC and bank details on Stripe
6. Stripe redirects back to `/marketplace/seller/onboarding?return=true`
7. Existing webhook route handles `account.updated` → sets `SellerProfile.stripeOnboarded = true`
8. Seller can now publish listings

**Required environment variables:**
```
STRIPE_SECRET_KEY           # already exists in monolith
STRIPE_PUBLISHABLE_KEY      # already exists in monolith
STRIPE_WEBHOOK_SECRET       # already exists in monolith
PLATFORM_FEE_PERCENT=5      # percentage used to compute application_fee_amount in stripe-connect.ts
EASYPOST_API_KEY            # optional — mock shipping rates used if missing
```

Note: `STRIPE_CONNECT_CLIENT_ID` is not needed — Stripe Connect Express uses account links, not OAuth.

---

## Protected Routes

Add the following to `protectedPaths` in `src/lib/middleware/withAuth.ts`:
```ts
'/marketplace/sell',
'/marketplace/my',
'/marketplace/seller/dashboard',
'/marketplace/seller/onboarding',
'/marketplace/admin',
'/marketplace/checkout',
```

Public routes (no auth required): `/marketplace`, `/marketplace/[slug]`, `/marketplace/seller/[userId]`

---

## Garage Integration

**"Sell from Garage" flow:**
- Add "Sell This Bike" button to `src/app/bikes/garage/[bikeId]/page.tsx`
- Button links to `/marketplace/sell?fromBike=[bikeId]`
- `sell/page.tsx` reads `searchParams.fromBike`, fetches the `UserBike` record
- Pre-fills form: title (`${year} ${brand} ${model}`), category (`complete_bike`), brand, year, description from bike notes
- `fromGarageBikeId` stored on the created `Listing` for traceability

---

## What Gets Replaced in the Existing Monolith Scaffold

These files are deleted and replaced by the migrated standalone equivalents:
- `src/modules/marketplace/actions/` — all 6 existing action files
- `src/modules/marketplace/components/` — all 14 existing component files
- `src/modules/marketplace/lib/queries.ts`
- `src/modules/marketplace/types/index.ts`
- `src/app/marketplace/` — all 6 existing route pages

These existing API routes are deleted (superseded by module actions):
- `src/app/api/marketplace/favorites/route.ts` — replaced by `saves` action
- `src/app/api/marketplace/create-listing-checkout/route.ts` — replaced by Stripe Connect PaymentIntent flow
- `src/app/api/marketplace/images/route.ts` — replaced by Vercel Blob upload in `photos.ts`
- `src/app/api/marketplace/status/route.ts` — replaced by `listing-mutations.ts`
- `src/app/api/marketplace/listings/` — replaced by module actions

---

## Testing

**Unit tests (Vitest):**
- `listing-mutations.test.ts` — create, update, delete, ownership enforcement
- `offers.test.ts` — make offer, counter-offer chain, accept/decline, expiry
- `transactions.test.ts` — platform fee calculation (`PLATFORM_FEE_PERCENT`), status transitions
- `trust.test.ts` — seller trust score calculation

**Manual verification checklist:**
- [ ] Browse → filter by category/condition/location → results update correctly
- [ ] Create listing → photos upload to Vercel Blob → listing enters `pending_review`
- [ ] Admin approves listing from review queue → status becomes `active`
- [ ] Make offer → seller counters → buyer accepts → checkout flow triggers
- [ ] Stripe test card `4242 4242 4242 4242` → payment succeeds → transaction created
- [ ] Stripe test card `4000 0000 0000 9995` → payment declined → error shown
- [ ] Seller adds tracking number → transaction status → `shipped`
- [ ] Seller onboarding: Stripe Express test account created, redirect completes, `stripeOnboarded = true`
- [ ] "Sell from Garage" → form pre-filled with bike data, `fromGarageBikeId` set on listing
- [ ] Auto-expire cron: listing past `expiresAt` moves to `expired` (requires `CRON_SECRET`)
- [ ] Report listing → appears in admin reports page
- [ ] Unauthenticated access to `/marketplace/sell` → redirected to sign-in
- [ ] Existing creator Stripe webhook (`account.updated`) still fires correctly after webhook route update
