# Shop Owner Portal — Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Goal

Give bike shop owners a self-service portal to claim or submit their listing on Ride MTB, then manage it — edit info, upload photos, respond to reviews, and track lead activity.

---

## Architecture

The portal lives entirely within the existing `src/modules/shops/` module and `src/app/shops/` route tree. No new module is created.

### Schema Additions (one Prisma migration)

**New enum:**
```prisma
enum ShopStatus {
  draft
  pending_review
  active
  claimed
}
```

**New field on `Shop`:**
```prisma
status     ShopStatus @default(active)
submittedByUserId String?
submittedBy       User?   @relation("ShopSubmittedBy", fields: [submittedByUserId], references: [id])
```

Existing records default to `active`.

**New model — `ShopClaimRequest`:**
```prisma
model ShopClaimRequest {
  id           String      @id @default(cuid())
  shopId       String
  userId       String
  businessRole String
  proofDetail  String
  status       ClaimStatus @default(pending)
  adminNote    String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  shop  Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([shopId, userId, status])
}

enum ClaimStatus {
  pending
  approved
  rejected
}
```

**New model — `LeadEvent`:**
```prisma
model LeadEvent {
  id        String        @id @default(cuid())
  shopId    String
  eventType LeadEventType
  createdAt DateTime      @default(now())

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@index([shopId, createdAt])
}

enum LeadEventType {
  website_click
  phone_click
  directions_click
}
```

### New Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/shops/owner/new` | Submit a new shop listing | Signed in |
| `/shops/[slug]/claim` | Claim an existing shop | Signed in |
| `/shops/[slug]/manage` | Owner dashboard (redirects to `/edit`) | Shop owner |
| `/shops/[slug]/manage/edit` | Edit shop info | Shop owner |
| `/shops/[slug]/manage/photos` | Photo management | Shop owner |
| `/shops/[slug]/manage/reviews` | Respond to reviews | Shop owner |
| `/shops/[slug]/manage/analytics` | Lead event analytics | Shop owner |
| `/api/shops/[slug]/track` | Record lead event | Public (rate-limited) |
| `/admin/shops/claims` | Admin claim review queue | Admin |
| `/admin/shops/submissions` | Admin submission review queue | Admin |

### New Auth Guard

Add `requireShopOwner(slug: string)` to `src/lib/auth/guards.ts`:
- Calls `requireAuth()` to get the current user
- Fetches shop by slug, checks `shop.ownerId === user.id` OR `user.role === 'admin'`
- Throws redirect to `/signin` if not authenticated, 404 if shop not found, 403 if not owner

---

## Section 1: Claim & Submit Flow

### Claiming an Existing Shop

**Trigger:** The public shop detail page (`/shops/[slug]`) shows a "Claim this listing" link when `shop.ownerId === null`. Hidden for shops that already have an owner.

**Form** (`/shops/[slug]/claim`):
- Business role field: dropdown (Owner, Manager, Employee)
- Proof detail field: freetext (e.g. "I'm the owner — business email: kyle@bluepinebikes.com")
- Submit → creates `ShopClaimRequest` with `status: pending`
- One pending claim per user per shop (unique constraint enforced)

**Admin approval** (`/admin/shops/claims`):
- Approve → sets `shop.ownerId = claim.userId`, `shop.status = claimed`, marks claim `approved`, sends in-app notification to claimant
- Reject → admin writes a rejection note, marks claim `rejected`, sends in-app notification

### Submitting a New Shop

**Form** (`/shops/owner/new`) — multi-step:
1. Basic info: name, shop type, address, city, state, zip
2. Contact + hours: phone, email, website, day-by-day open/close times
3. Services + brands: multi-select chips + tag input
4. Review + submit

**On submit:**
- `Shop` created with `status: pending_review`, `submittedByUserId` set, `ownerId` set to submitter immediately
- Shop is not publicly visible until approved

**Admin approval** (`/admin/shops/submissions`):
- Approve → `status: claimed`, shop becomes publicly visible, submitter notified
- Reject → admin note, `status: draft`, submitter notified

### Admin Manual Assignment

Added to existing `/admin/shops/[id]` page:
- "Assign Owner" field: user email search → select → sets `shop.ownerId` + `shop.status: claimed`
- "Remove Owner" button: clears `shop.ownerId`, sets `status: active`

---

## Section 2: Owner Dashboard

URL structure: `/shops/[slug]/manage/[tab]`

All tabs share a layout with the shop name, status badge, and tab navigation (Edit Info | Photos | Reviews | Analytics). A "View public listing" link opens `/shops/[slug]` in a new tab.

### Edit Info Tab (`/manage/edit`)

Fields: name, description, address, city, state, zip, phone, email, website, shop type, services (multi-select), brands (tag input), hours (day-by-day open/close or "Closed")

Server action `updateShop(shopId, input)`:
- Guarded by `requireShopOwner(slug)`
- Validates with Zod
- Calls `revalidatePath('/shops/[slug]')` after save

### Photos Tab (`/manage/photos`)

- Upload: image file → Vercel Blob → creates `ShopPhoto` record with `shopId`, `url`, `sortOrder`
- Drag-to-reorder: updates `sortOrder` on all affected records
- Set cover: sets `isCover: true` on selected photo, clears `isCover` on others
- Delete: removes from Blob + deletes `ShopPhoto` record
- Max 10 photos per shop (enforced server-side)

### Reviews Tab (`/manage/reviews`)

- Lists all `ShopReview` records for the shop, newest first
- Shows reviewer name, star ratings, review text, date
- Reviews without `ownerResponse` show a "Reply" button
- Reply form: freetext → saves to `ShopReview.ownerResponse` + `ownerResponseAt`
- Owner response is displayed on the public shop detail page below the review
- Owner cannot edit or delete reviews — only respond once per review

### Analytics Tab (`/manage/analytics`)

Summary cards (all-time totals):
- Website clicks
- Phone clicks
- Directions clicks

30-day bar chart: grouped by date, stacked by event type. Implemented as a CSS-only bar chart (no external charting library).

Queries:
- `getShopLeadSummary(shopId)` → `{ websiteClicks, phoneCalls, directionsClicks }` totals
- `getShopLeadsByDay(shopId, days: 30)` → array of `{ date, website_click, phone_click, directions_click }` grouped by day

---

## Section 3: Lead Tracking

### Instrumentation

The existing `ShopDetail` component's "Call", "Get Directions", and "Visit Website" buttons are extracted into a new client component `ShopActionButtons`. On click:
1. Fire-and-forget `fetch('POST /api/shops/[slug]/track', { eventType })` — client does not await
2. Immediately perform the primary action (open link / initiate call)

### API Route (`/api/shops/[slug]/track`)

- No authentication required (anonymous visitors tracked)
- Rate-limited by IP: max 5 events per shop per IP per hour (using existing Upstash Redis rate limiter)
- Creates `LeadEvent` record
- Returns 200 immediately
- Silently drops requests over the rate limit (no error to client)

---

## Section 4: Admin Additions

### Claims Queue (`/admin/shops/claims`)

Table columns: Shop name, Claimant name/email, Role, Proof detail, Submitted date, Status

- Default filter: pending claims only (filterable to show approved/rejected)
- Approve button → triggers claim approval server action
- Reject button → opens inline form for admin note → triggers rejection action
- Both actions send an in-app notification to the claimant via the existing notifications system

### Submissions Queue (`/admin/shops/submissions`)

Table columns: Shop name, Type, City/State, Submitter name, Submitted date

- Shows all shops with `status: pending_review`
- "Preview" link opens public detail preview
- Approve / Reject actions same pattern as claims queue

---

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ShopStatus`, `ClaimStatus`, `LeadEventType` enums; add `status` + `submittedByUserId` to `Shop`; add `ShopClaimRequest` and `LeadEvent` models |
| `src/lib/auth/guards.ts` | Add `requireShopOwner(slug)` |
| `src/modules/shops/lib/queries.ts` | Add owner queries: `getShopForOwner`, `getShopLeadSummary`, `getShopLeadsByDay`, `getPendingClaims`, `getPendingSubmissions` |
| `src/modules/shops/actions/claimShop.ts` | New — submit claim request |
| `src/modules/shops/actions/submitShop.ts` | New — submit new shop listing |
| `src/modules/shops/actions/updateShop.ts` | New — owner edits shop info |
| `src/modules/shops/actions/uploadShopPhoto.ts` | New — upload + manage photos |
| `src/modules/shops/actions/respondToReview.ts` | New — owner responds to review |
| `src/modules/shops/actions/adminShops.ts` | New — approve/reject claims and submissions, manual owner assignment |
| `src/modules/shops/components/ShopActionButtons.tsx` | New — client component wrapping CTA buttons with lead tracking |
| `src/modules/shops/components/owner/` | New — dashboard layout + tab components |
| `src/app/shops/[slug]/claim/page.tsx` | New — claim form page |
| `src/app/shops/owner/new/page.tsx` | New — new shop submission form |
| `src/app/shops/[slug]/manage/layout.tsx` | New — owner dashboard layout |
| `src/app/shops/[slug]/manage/edit/page.tsx` | New |
| `src/app/shops/[slug]/manage/photos/page.tsx` | New |
| `src/app/shops/[slug]/manage/reviews/page.tsx` | New |
| `src/app/shops/[slug]/manage/analytics/page.tsx` | New |
| `src/app/api/shops/[slug]/track/route.ts` | New — lead tracking endpoint |
| `src/app/admin/shops/claims/page.tsx` | New — admin claims queue |
| `src/app/admin/shops/submissions/page.tsx` | New — admin submissions queue |
| `src/app/shops/[slug]/page.tsx` | Modify — add "Claim this listing" link, swap CTA buttons for `ShopActionButtons` |
| `src/app/admin/shops/[id]/page.tsx` | Modify — add manual owner assignment UI |

---

## Error Handling

- `requireShopOwner` redirects unauthenticated users to `/signin?callbackUrl=...`; returns 404 if shop not found; returns 403 if user is not the owner
- Claim submission: duplicate pending claim returns a user-visible error ("You already have a pending claim for this shop")
- Photo upload: over-limit (>10) returns error; Blob upload failure surfaces as form error
- Lead tracking API: silent drop on rate limit (200 response, no event created); no error propagates to client
- New shop submission: slug collision resolved via existing `uniqueSlug()` utility

## Testing

- Verify unauthenticated users cannot access `/shops/[slug]/manage/*` (redirected to signin)
- Verify non-owners cannot access another shop's manage routes (403)
- Verify claim form creates `ShopClaimRequest` record; duplicate prevented
- Verify admin approval sets `ownerId` and `status: claimed`
- Verify new shop submission creates shop with `pending_review` status; not visible in public directory until approved
- Verify lead tracking fires on button click and creates `LeadEvent`; rate limit prevents >5 per hour per IP
- Verify photo upload creates Blob URL and `ShopPhoto` record; max 10 enforced
- Verify owner response saves to `ownerResponse` field and renders on public shop page
