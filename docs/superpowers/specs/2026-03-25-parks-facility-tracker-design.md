# Parks & Facility Tracker — Design Spec

## Goal

Add a skatepark, pump track, and bike park tracker to the Ride MTB monolith. Data sourced from OpenStreetMap via admin-triggered sync. Facilities are surfaced as independent map layers on the existing `/trails/map` page, a browsable state-based directory, and standalone detail pages with community reviews and photos.

## Architecture Overview

- **Data**: Single `Facility` Prisma model + `FacilityReview` + `FacilityPhoto`, stored in Supabase
- **Data source**: OSM Overpass API, admin-triggered sync, upserted by `osmId`
- **Map**: Three new independent layers on the existing `UnifiedMapDynamic` component
- **Directory**: `/parks` → `/parks/[state]` → `/parks/[state]/[slug]`
- **Community**: Ratings + text reviews + photos with Claude Vision moderation + manual admin approval
- **Admin**: New `/admin/parks` section integrated into the existing admin dashboard

---

## Data Model

### `Facility`

`osmId` stores the prefixed form of the OSM element ID (e.g., `"w123456"` for a way, `"r789012"` for a relation) to guarantee global uniqueness across element types.

Average rating and review count are **computed on-the-fly** via Prisma aggregate queries — no denormalized fields on `Facility`. This keeps data consistent at the cost of one extra query per detail page and per-facility map fetch; acceptable for v1.

```prisma
model Facility {
  id            String       @id @default(cuid())
  osmId         String       @unique  // prefixed: "w123456", "r789012"
  type          FacilityType
  name          String
  slug          String       @unique
  latitude      Float
  longitude     Float
  address       String?
  city          String?
  state         String?
  stateSlug     String?
  operator      String?
  openingHours  String?
  surface       String?
  website       String?
  phone         String?
  lit           Boolean?
  fee           Boolean?
  description   String?
  metadata      Json?
  lastSyncedAt  DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  reviews       FacilityReview[]
  photos        FacilityPhoto[]

  @@index([type, stateSlug])
  @@index([stateSlug])
}

enum FacilityType {
  SKATEPARK
  PUMPTRACK
  BIKEPARK
}
```

**Note on `syncInProgress`**: Since Vercel runs multiple serverless instances, a module-level boolean cannot guard against concurrent syncs. Instead, a single row in a `SyncState` table (or a dedicated row on a `GlobalSetting` model if one exists) should be used. The `syncFacilitiesFromOSM()` action sets `syncInProgress = true` at the start and `false` on completion or error. Any second invocation checks this flag and returns early with "sync already in progress".

### `FacilityReview`

```prisma
model FacilityReview {
  id         String   @id @default(cuid())
  facilityId String
  userId     String
  rating     Int      // 1–5
  body       String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  facility   Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([facilityId, userId])
}
```

Review text moderation via Claude (`claude-haiku-4-5`) is **ephemeral** — the action is taken (auto-reject or allow) and no AI verdict is stored on the review row. This is intentional for v1: the volume of reviews is low enough that a stored audit trail is not needed.

### `FacilityPhoto`

```prisma
model FacilityPhoto {
  id           String              @id @default(cuid())
  facilityId   String
  userId       String
  storageKey   String              // Supabase Storage path
  caption      String?
  status       FacilityPhotoStatus @default(PENDING)
  aiVerdict    String?             // "APPROVED" | "FLAGGED" | "REJECTED" — stored for admin context
  createdAt    DateTime            @default(now())

  facility     Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([facilityId, status])
}

enum FacilityPhotoStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## URL Structure

| Route | Description |
|-------|-------------|
| `/parks` | State grid — click a state to browse |
| `/parks/[state]` | Unified facility list, filterable by type / surface / lit |
| `/parks/[state]/[slug]` | Facility detail page |
| `/admin/parks` | Sync panel + stats |
| `/admin/parks/photos` | Photo moderation queue |

---

## Map Integration

### New layer names

```ts
export type LayerName = 'trails' | 'events' | 'coaching' | 'skateparks' | 'pumptracks' | 'bikeparks'
```

### Pin styles (Lucide icons, custom HTML Mapbox markers)

| Type | Icon | Color |
|------|------|-------|
| Skatepark | `<Zap />` | `#F97316` (orange) |
| Pump track | `<Bike />` | `#14B8A6` (teal) |
| Bike park | `<Mountain />` | `#8B5CF6` (purple) |

Pins rendered via `ReactDOM.renderToStaticMarkup` → Mapbox `HTMLElement` markers.

### `LayerToggle.tsx` — required updates

`LAYER_COLORS` and `LAYER_LABELS` are typed as `Record<LayerName, string>` and will cause a TypeScript error when `LayerName` gains the three new values. Both records **must** be extended:

```ts
const LAYER_COLORS: Record<LayerName, string> = {
  trails: '#16a34a',
  events: '#ef4444',
  coaching: '#3b82f6',
  skateparks: '#F97316',   // orange
  pumptracks: '#14B8A6',  // teal
  bikeparks: '#8B5CF6',   // purple
}

const LAYER_LABELS: Record<LayerName, string> = {
  trails: 'Trails',
  events: 'Events',
  coaching: 'Coaching',
  skateparks: 'Skateparks',
  pumptracks: 'Pump Tracks',
  bikeparks: 'Bike Parks',
}
```

### `UnifiedMap.tsx` — required updates

Three new conditional render blocks must be added after the existing `CoachesLayer` block:

```tsx
{mapLoaded && mapRef.current && availableLayers.includes('skateparks') && activeLayers.has('skateparks') && (
  <SkateparksLayer map={mapRef.current} />
)}
{mapLoaded && mapRef.current && availableLayers.includes('pumptracks') && activeLayers.has('pumptracks') && (
  <PumpTracksLayer map={mapRef.current} />
)}
{mapLoaded && mapRef.current && availableLayers.includes('bikeparks') && activeLayers.has('bikeparks') && (
  <BikeParksLayer map={mapRef.current} />
)}
```

Also add the three new imports at the top of `UnifiedMap.tsx`.

### Layer components

- `src/modules/map/components/layers/SkateparksLayer.tsx`
- `src/modules/map/components/layers/PumpTracksLayer.tsx`
- `src/modules/map/components/layers/BikeParksLayer.tsx`

**Fetch pattern**: Layer components are `'use client'` components. They fetch facility data via `fetch('/api/facilities?type=skateparks')` — a Route Handler at `src/app/api/facilities/route.ts` — matching the existing pattern used by `TrailsLayer` (`fetch('/api/trails/map')`). Do **not** import server actions directly into these components.

### Route Handler

`src/app/api/facilities/route.ts` — accepts `?type=skateparks|pumptracks|bikeparks`, reads from the `Facility` table, and returns `FacilityPin[]` including pre-computed average rating from a Prisma aggregate.

### Map popup on pin click

```
Venice Skate Park             ← name
Venice, CA · Concrete · Lit   ← city, state, surface, lit
★ 4.2 (18 reviews)            ← average rating + count
[View Details →]              ← link to /parks/california/venice-skate-park
```

### `/trails/map` page update

Three new layers added to `availableLayers`, all **off by default**:

```tsx
<UnifiedMapDynamic
  defaultLayers={['trails']}
  availableLayers={['trails', 'events', 'coaching', 'skateparks', 'pumptracks', 'bikeparks']}
  className="h-full"
/>
```

---

## Data Sync

### Overpass queries

| Type | Primary tags |
|------|-------------|
| Skateparks | `sport=skateboard` on ways + relations |
| Pump tracks | `cycling=pump_track` OR `mtb:type=pumptrack` on ways + relations |
| Bike parks | `leisure=bikepark` on ways + relations |

Scope: US-only bounding box. `osmId` is stored as the prefixed string (e.g., `"w" + element.id` for ways, `"r" + element.id` for relations) to prevent ID collisions across element types.

### Sync flow

1. Admin clicks "Sync from OSM" at `/admin/parks`
2. `syncFacilitiesFromOSM()` server action checks the `SyncState` table — returns early with error if `syncInProgress = true`
3. Sets `syncInProgress = true` in `SyncState`
4. Three sequential Overpass queries with `sleep(2000)` between each (rate limit safety)
5. Results upserted into `Facility` by `osmId` — new records inserted, existing updated, nothing deleted
6. Sets `syncInProgress = false`, updates `lastSyncedAt`, returns `{ added, updated }` counts
7. On error: sets `syncInProgress = false`, rethrows — admin sees error message, existing data untouched

### `SyncState` model (single row)

```prisma
model SyncState {
  id             String    @id @default("singleton")
  syncInProgress Boolean   @default(false)
  lastSyncedAt   DateTime?
  lastSyncResult Json?     // { added, updated, error }
}
```

### Location

`src/modules/parks/actions/sync.ts`

---

## Community Features

### Reviews

- Logged-in users only
- One review per user per facility (upsert on resubmit = edit)
- Fields: `rating` (1–5, required) + `body` (text, optional)
- Displayed newest-first with display name and avatar
- Average rating computed via Prisma `_avg` aggregate on render — no cached field
- Claude (`claude-haiku-4-5`) screens review body text synchronously before saving — auto-reject obvious slurs/spam, allow the rest. Verdict is **not stored** (ephemeral moderation for v1).

### Photos

**EXIF stripping**: Use `piexifjs` (no `sharp` is installed in this project). Install: `npm install piexifjs`. `piexif.remove()` applies to JPEG only — call it when `mimetype === 'image/jpeg'` and skip for PNG/WebP (those formats do not embed EXIF; `piexifjs` will not process them). Strip before upload to Supabase Storage.

**Upload pipeline:**

1. Server validates MIME type via magic bytes (not file extension) — accept `image/jpeg`, `image/png`, `image/webp` only. Max 10MB.
2. EXIF metadata stripped via `piexifjs` (`piexif.remove(buffer)`)
3. Stored at `facility-photos/{facilityId}/{userId}/{filename}` in Supabase Storage
4. Claude Vision (`claude-haiku-4-5`) screens image — verdict stored in `aiVerdict` field:
   - `"APPROVED"` → `status = PENDING`, `aiVerdict = "APPROVED"` — admin can bulk-confirm
   - `"FLAGGED"` → `status = PENDING`, `aiVerdict = "FLAGGED"` — needs manual review, stays hidden
   - `"REJECTED"` → file deleted from Supabase Storage, `FacilityPhoto` record deleted, user shown policy violation message
5. If Claude API is unavailable: `status = PENDING`, `aiVerdict = "FLAGGED"` (conservative fallback)
6. Photos only visible publicly when `status = APPROVED`

**Rate limits:**
- Max 5 photos per user per facility
- Max 20 photo uploads per user per day across all facilities

### Server actions

| Action | File | Description |
|--------|------|-------------|
| `submitFacilityReview(facilityId, rating, body)` | `reviews.ts` | Upserts review, runs text moderation |
| `uploadFacilityPhoto(facilityId, file)` | `photos.ts` | Validates, strips EXIF, uploads, runs Vision screen |
| `deleteFacilityPhoto(photoId)` | `photos.ts` | Owner or admin only |
| `approveFacilityPhoto(photoId)` | `photos.ts` | Admin only — sets `status = APPROVED` |
| `rejectFacilityPhoto(photoId)` | `photos.ts` | Admin only — sets `status = REJECTED`, deletes from Storage |

---

## Admin Panel

### `/admin/parks`

- Stats row: count per type + last synced timestamp (read from `SyncState`)
- "Sync from OSM" button — disabled when `syncInProgress = true`, shows spinner during sync
- Displays `{ added, updated }` counts from last sync result
- Link to photo queue with pending count badge

### `/admin/parks/photos`

- Tabs: Pending | Flagged | Approved | Rejected
- Each item: photo thumbnail, facility name, uploader, upload time, `aiVerdict` label
- One-click Approve / Reject
- Bulk approve all photos where `aiVerdict = "APPROVED"` and `status = PENDING`

### Admin nav badge

If photo queue has items with `status = PENDING` and `createdAt` older than 24 hours, a badge appears on the Parks nav item.

---

## Module Structure

```
src/modules/parks/
  actions/
    sync.ts          — syncFacilitiesFromOSM
    facilities.ts    — getFacilitiesByType, getFacilityBySlug, getFacilitiesByState
    reviews.ts       — submitFacilityReview
    photos.ts        — uploadFacilityPhoto, deleteFacilityPhoto, approveFacilityPhoto, rejectFacilityPhoto
  components/
    FacilityCard.tsx
    FacilityDetail.tsx
    ReviewForm.tsx
    ReviewList.tsx
    PhotoGallery.tsx
    PhotoUpload.tsx
  lib/
    moderation.ts    — Claude Vision + text screening helpers
    overpass.ts      — Overpass API query helpers
    exif.ts          — EXIF stripping via piexifjs
  types/
    index.ts         — FacilityPin, FacilityWithReviews, etc.
```

```
src/app/api/facilities/
  route.ts                         — GET ?type=skateparks|pumptracks|bikeparks → FacilityPin[]

src/app/parks/
  page.tsx                         — state grid
  [state]/
    page.tsx                       — facility list with filters
    [slug]/
      page.tsx                     — facility detail

src/app/admin/parks/
  page.tsx                         — sync panel
  photos/
    page.tsx                       — moderation queue
```

---

## Error Handling

- Overpass timeout: caught, user-facing error message, `syncInProgress` reset to false, no data mutation
- Claude API unavailable during photo screen: photo enters queue as FLAGGED (conservative fallback)
- Claude API unavailable during review screen: review is allowed through (optimistic fallback — low risk for text)
- Supabase Storage failure: upload aborted, error returned to client, no DB record created
- Concurrent sync attempt: `SyncState.syncInProgress = true` check returns early with "Sync already in progress" message

---

## Out of Scope (v1)

- User photo appeals
- Flagging reviews or photos by other users
- Trail-to-facility proximity ("near this trail")
- International facilities (US only for now)
- Facility claim/ownership by operators
- Stored AI moderation audit trail for reviews (ephemeral for v1)
