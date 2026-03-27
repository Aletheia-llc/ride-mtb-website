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

**New enums** (using SCREAMING_SNAKE_CASE to match existing project conventions):
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

**New fields on `Shop` and required changes to existing `Shop` fields:**
```prisma
// New fields
status            ShopStatus @default(ACTIVE)
submittedByUserId String?
submittedBy       User?      @relation("ShopSubmittedBy", fields: [submittedByUserId], references: [id])

// Required change to existing field — must add relation name to avoid Prisma ambiguity
// (two relations between User and Shop now exist)
owner  User?  @relation("ShopOwner", fields: [ownerId], references: [id], onDelete: SetNull)
```

Existing records default to `ACTIVE`. Both `ACTIVE` and `CLAIMED` shops are publicly visible; `DRAFT` and `PENDING_REVIEW` are not.

`CLAIMED` means "publicly visible with an assigned owner" regardless of how ownership was established (claim flow or new-submission approval). `ACTIVE` means "publicly visible with no owner." Removing an owner from any shop (regardless of origin) sets it back to `ACTIVE`.

**Required back-relations on `User` model:**
```prisma
submittedShops    Shop[]             @relation("ShopSubmittedBy")
shopClaimRequests ShopClaimRequest[]
```

**Required change to existing `User.shops` field** — Prisma will fail to compile once a second `User ↔ Shop` relation is added (`submittedBy`). The existing unnamed relation must be named before or in the same migration:
```prisma
shops Shop[] @relation("ShopOwner")
```

**Required back-relations on `Shop` model** (Prisma requires both sides of every relation):
```prisma
claimRequests ShopClaimRequest[]
leadEvents    LeadEvent[]
```

**New model — `ShopClaimRequest`:**
```prisma
model ShopClaimRequest {
  id           String      @id @default(cuid())
  shopId       String
  userId       String
  businessRole String
  proofDetail  String
  status       ClaimStatus @default(PENDING)
  adminNote    String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  shop  Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([shopId, userId])
}
```

Note: `@@unique([shopId, userId])` means a user can only ever submit one claim per shop. If rejected, they cannot re-claim (must contact admin).

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
```

### New Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/shops/submit` | Submit a new shop listing | Signed in |
| `/shops/[slug]/claim` | Claim an existing shop | Signed in |
| `/shops/[slug]/manage` | Redirect-only — forwards to `/shops/[slug]/manage/edit` | Shop owner |
| `/shops/[slug]/manage/edit` | Edit shop info | Shop owner |
| `/shops/[slug]/manage/photos` | Photo management | Shop owner |
| `/shops/[slug]/manage/reviews` | Respond to reviews | Shop owner |
| `/shops/[slug]/manage/analytics` | Lead event analytics | Shop owner |
| `/api/shops/[slug]/track` | Record lead event | Public (rate-limited) |
| `/admin/shops` | All shops index | Admin |
| `/admin/shops/[id]` | Shop detail with manual owner assignment | Admin |
| `/admin/shops/claims` | Admin claim review queue | Admin |
| `/admin/shops/submissions` | Admin submission review queue | Admin |
| `/admin/shops/preview/[id]` | Admin-only shop preview (bypasses public status filter) | Admin |

### New Auth Guard

Add `requireShopOwner(slug: string)` to `src/lib/auth/guards.ts`:
- Calls `requireAuth()` to get the current user (which already redirects to `/signin` if unauthenticated)
- Fetches shop by slug; calls `notFound()` if shop does not exist
- Checks `shop.ownerId === user.id` OR `user.role === 'admin'`; calls `redirect('/403')` if neither (consistent with existing guard pattern)

---

## Section 1: Claim & Submit Flow

### Claiming an Existing Shop

**Trigger:** The public shop detail page (`/shops/[slug]`) shows a "Claim this listing" link when `shop.ownerId === null`. Hidden for shops that already have an owner.

**Form** (`/shops/[slug]/claim`):
- Business role field: dropdown (Owner, Manager, Employee)
- Proof detail field: freetext (e.g. "I'm the owner — business email: kyle@bluepinebikes.com")
- Submit → creates `ShopClaimRequest` with `status: PENDING`
- One pending claim per user per shop (unique constraint enforced)

**Admin approval** (`/admin/shops/claims`):
- Approve → sets `shop.ownerId = claim.userId`, `shop.status = CLAIMED`, marks claim `APPROVED`, sends in-app notification to claimant
- Reject → admin writes a rejection note, marks claim `REJECTED`, sends in-app notification

### Submitting a New Shop

**Form** (`/shops/submit`) — multi-step:
1. Basic info: name, shop type, address, city, state, zip
2. Contact + hours: phone, email, website, day-by-day open/close times
3. Services + brands: multi-select chips + tag input
4. Review + submit

**On submit:**
- `Shop` created with `status: PENDING_REVIEW`, `submittedByUserId` set, `ownerId` set to submitter immediately
- Shop is not publicly visible until approved

**Admin approval** (`/admin/shops/submissions`):
- Approve → `status: CLAIMED`, shop becomes publicly visible, submitter notified
- Reject → admin note, `status: DRAFT`, `ownerId` is cleared to `null` (submitter loses ownership of the rejected listing), submitter notified. There is no re-submission flow — the submitter must contact admin if they want to resubmit.

### Admin Manual Assignment

New pages at `/admin/shops/` (no existing admin shops pages exist):
- `/admin/shops/page.tsx` — index listing all shops (name, status, owner, type, city) with links to each
- `/admin/shops/[id]/page.tsx` — shop detail with "Assign Owner" field (user email search → select → sets `shop.ownerId` + `shop.status: CLAIMED`) and "Remove Owner" button (clears `shop.ownerId`, sets `status: ACTIVE`)

---

## Section 2: Owner Dashboard

URL structure: `/shops/[slug]/manage/[tab]`

All tabs share a layout with the shop name, status badge, and tab navigation (Edit Info | Photos | Reviews | Analytics). A "View public listing" link opens `/shops/[slug]` in a new tab.

### Edit Info Tab (`/manage/edit`)

Fields: name, description, address, city, state, zip, phone, email, website, shop type, services (multi-select), brands (tag input), hours (day-by-day open/close or "Closed")

Server action `updateShop(slug, input)`:
- Guarded by `requireShopOwner(slug)` (slug available in action scope from the route)
- Validates with Zod
- Calls `revalidatePath(\`/shops/${slug}\`)` after save

### Photos Tab (`/manage/photos`)

- Upload: image file → Vercel Blob → creates `ShopPhoto` record with `shopId`, `url`, `sortOrder`
- Drag-to-reorder: updates `sortOrder` on all affected records
- Set cover: sets `isPrimary: true` on selected photo, clears `isPrimary` on others (field is `isPrimary` in the existing `ShopPhoto` model)
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
- `getShopLeadSummary(shopId)` → `{ websiteClicks, phoneClicks, directionsClicks }` totals
- `getShopLeadsByDay(shopId, days: 30)` → array of `{ date, websiteClicks, phoneClicks, directionsClicks }` grouped by day

---

## Section 3: Lead Tracking

### Instrumentation

The existing `ShopDetail` component's "Call", "Get Directions", and "Visit Website" buttons are extracted into a new client component `ShopActionButtons`. On click:
1. Fire-and-forget `fetch('POST /api/shops/[slug]/track', { eventType })` — client does not await
2. Immediately perform the primary action (open link / initiate call)

### API Route (`/api/shops/[slug]/track`)

- No authentication required (anonymous visitors tracked)
- Rate-limited by IP **per shop**: max 3 events per shop per IP per minute. The key must include the shop slug to prevent the limit from being shared across all shops: `rateLimit({ identifier: ip, action: \`shop-track:${slug}\`, maxPerMinute: 3 })`. The rate limiter **throws** on both rate-limit hits and misconfiguration, so the route handler wraps the entire call in try/catch and returns 200 immediately for any exception (silent drop — no error propagates to the client).
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

Table columns: Shop ID (hidden, used for preview link), Shop name, Type, City/State, Submitter name, Submitted date

- Shows all shops with `status: PENDING_REVIEW`. `getPendingSubmissions` returns `id`, `name`, `shopType`, `city`, `state`, and the submitter's name.
- "Preview" link routes to `/admin/shops/preview/[id]` — an admin-only page that renders the `ShopDetail` component directly, bypassing the public status filter. Do not link to the public `/shops/[slug]` page as `PENDING_REVIEW` shops are excluded from public queries.
- Approve / Reject actions same pattern as claims queue

---

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ShopStatus`, `ClaimStatus`, `LeadEventType` enums; add `status` + `submittedByUserId` to `Shop`; add `ShopClaimRequest` and `LeadEvent` models |
| `src/lib/auth/guards.ts` | Add `requireShopOwner(slug)` |
| `src/modules/shops/lib/queries.ts` | Add owner queries: `getShopForOwner`, `getShopLeadSummary`, `getShopLeadsByDay`, `getPendingClaims`, `getPendingSubmissions`; add `status: { in: [ShopStatus.ACTIVE, ShopStatus.CLAIMED] }` filter (import `ShopStatus` from `@/generated/prisma/client`) to existing public queries `getShops`, `getShopBySlug`, `getShopWithDetails`, `getShopsInBounds` |
| `src/modules/shops/actions/claimShop.ts` | New — submit claim request |
| `src/modules/shops/actions/submitShop.ts` | New — submit new shop listing |
| `src/modules/shops/actions/updateShop.ts` | New — owner edits shop info |
| `src/modules/shops/actions/uploadShopPhoto.ts` | New — upload + manage photos |
| `src/modules/shops/actions/respondToReview.ts` | New — owner responds to review |
| `src/modules/shops/actions/adminShops.ts` | New — approve/reject claims and submissions, manual owner assignment |
| `src/modules/shops/components/ShopActionButtons.tsx` | New — client component wrapping CTA buttons with lead tracking |
| `src/modules/shops/components/owner/` | New — dashboard layout + tab components |
| `src/app/shops/[slug]/claim/page.tsx` | New — claim form page |
| `src/app/shops/submit/page.tsx` | New — new shop submission form |
| `src/app/shops/[slug]/manage/page.tsx` | New — redirect-only page (`redirect(\`/shops/${slug}/manage/edit\`)`) |
| `src/app/shops/[slug]/manage/layout.tsx` | New — owner dashboard layout |
| `src/app/shops/[slug]/manage/edit/page.tsx` | New |
| `src/app/shops/[slug]/manage/photos/page.tsx` | New |
| `src/app/shops/[slug]/manage/reviews/page.tsx` | New |
| `src/app/shops/[slug]/manage/analytics/page.tsx` | New |
| `src/app/api/shops/[slug]/track/route.ts` | New — lead tracking endpoint |
| `src/app/admin/shops/page.tsx` | New — admin shops index (all shops list) |
| `src/app/admin/shops/[id]/page.tsx` | New — admin shop detail with manual owner assignment |
| `src/app/admin/shops/claims/page.tsx` | New — admin claims queue |
| `src/app/admin/shops/submissions/page.tsx` | New — admin submissions queue |
| `src/app/admin/shops/preview/[id]/page.tsx` | New — admin-only shop preview (bypasses public status filter) |
| `src/app/shops/[slug]/page.tsx` | Modify — add "Claim this listing" link, swap CTA buttons for `ShopActionButtons` |

---

## Error Handling

- `requireShopOwner` redirects unauthenticated users to `/signin` (via `requireAuth()`, which does not append a callbackUrl); calls `notFound()` if shop not found; calls `redirect('/403')` if user is not the owner
- Claim submission: duplicate pending claim returns a user-visible error ("You already have a pending claim for this shop")
- Photo upload: over-limit (>10) returns error; Blob upload failure surfaces as form error
- Lead tracking API: silent drop on rate limit (200 response, no event created); no error propagates to client
- New shop submission: slug collision resolved via existing `uniqueSlug(text, existsCheck)` utility — the `submitShop` action passes a database-querying `existsCheck` callback, e.g. `(s) => db.shop.findUnique({ where: { slug: s } }).then(Boolean)`

## Testing

- Verify unauthenticated users cannot access `/shops/[slug]/manage/*` (redirected to signin)
- Verify non-owners cannot access another shop's manage routes (403)
- Verify claim form creates `ShopClaimRequest` record; duplicate prevented
- Verify admin approval sets `ownerId` and `status: CLAIMED`
- Verify new shop submission creates shop with `PENDING_REVIEW` status; not visible in public directory until approved
- Verify lead tracking fires on button click and creates `LeadEvent`; rate limit prevents >3 per minute per IP per shop
- Verify photo upload creates Blob URL and `ShopPhoto` record; max 10 enforced
- Verify owner response saves to `ownerResponse` field and renders on public shop page
