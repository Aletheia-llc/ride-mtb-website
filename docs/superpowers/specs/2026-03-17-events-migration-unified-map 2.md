# Events Migration + Unified Map Design

**Goal:** Migrate the full-featured events module from the standalone `ride-mtb-events-race-calendar` repo into the monolith, build a shared `UnifiedMap` component with a layer toggle system for trails/events/coaching, and add coaching clinics as a new schedulable entity with map support.

**Architecture:** Three parallel workstreams — schema first, then the UnifiedMap component, then the events migration and coaching clinics features. The events map IS the EventsLayer inside UnifiedMap — built once, not twice.

**Tech Stack:** Next.js 15.5.12, Prisma v7, PostgreSQL (Supabase), Tailwind CSS v4, Mapbox GL JS v3, NextAuth v5, next-intl, Cal.com (coaching booking)

---

## Workstream 1 — Schema

Done first. All other workstreams depend on it.

### New `EventStatus` enum

The monolith's shared `ContentStatus` enum (`draft`, `published`, `archived`) does not cover the event lifecycle. Add a dedicated `EventStatus` enum and migrate `Event.status` from `ContentStatus` to `EventStatus`:

```prisma
enum EventStatus {
  draft
  pending_review
  published
  cancelled
  postponed
  completed
}
```

The `Event.status` field type changes from `ContentStatus @default(published)` to `EventStatus @default(published)`. `CoachingClinic.status` also uses `EventStatus`. A Prisma migration with a `ALTER TYPE` + `ALTER COLUMN` handles this.

### `EventType` enum — merged superset

The monolith currently has 7 values (`group_ride`, `race`, `skills_clinic`, `trail_work`, `social`, `demo_day`, `other`). The standalone repo has 14 different values. The new enum is an **explicit merged superset** that preserves all existing monolith values (so existing rows remain valid) while adding new ones from the standalone repo:

```prisma
enum EventType {
  // Preserved from monolith (existing rows use these)
  group_ride
  race           // legacy — new submissions should use race_* variants
  skills_clinic  // legacy — new submissions should use clinic or camp
  trail_work
  social
  demo_day
  other

  // Added from standalone repo
  race_xc
  race_enduro
  race_dh
  race_marathon
  race_other
  clinic
  camp
  expo
  bike_park_day
  virtual_challenge
}
```

**No data migration required** — existing rows keep their current `EventType` values (`race`, `skills_clinic`, etc.). The legacy values are deprecated for new submissions only (enforced in the submit form via UI, not DB constraint). This avoids a breaking migration against production data.

### Event model additions

Add all remaining fields from the standalone repo. The monolith already has `latitude Float?`, `longitude Float?`, `eventTypeEnum`, `organizerId`, `registrationUrl`, `registrationDeadline`, `costCents`, `isFree`, `isFeatured`, `resultsUrl`, `resultsPosted`. Remove `eventTypeEnum` (superseded by the expanded `EventType`) and `costCents` (superseded by `isFree`/`registrationUrl`). Add the truly missing fields:

```prisma
model Event {
  // existing fields kept as-is...

  // Location (structured — lat/longitude already exist as Float?)
  venueName            String?
  address              String?
  city                 String?
  state                String?
  zipCode              String?
  country              String   @default("US")

  // Rich metadata
  shortDescription     String?
  coverImageUrl        String?
  tags                 String[] @default([])
  difficulty           String?

  // Virtual events
  isVirtual            Boolean  @default(false)
  virtualPlatform      String?
  virtualUrl           String?

  // Time
  startTime            String?
  endTime              String?
  timezone             String?
  isAllDay             Boolean  @default(false)

  // Engagement counters (denormalized)
  viewCount            Int      @default(0)
  commentCount         Int      @default(0)
  rsvpCount            Int      @default(0)

  // External import tracking (app-level dedup only, no DB unique constraint)
  importSource         String?
  externalId           String?

  // status field type changes from ContentStatus to EventStatus (see above)
}
```

**Float vs Decimal:** `Event.latitude`/`longitude` remain `Float?` (already in prod). `UserEventPreference` uses `Decimal @db.Decimal(10, 7)` to match the standalone repo. `CoachingClinic` uses `Float?` for consistency with `Event`. This inconsistency is intentional — `Float` is sufficient for map pin precision and avoids a costly column migration on the events table.

**Cost handling:** `Event` uses `isFree Boolean` + `registrationUrl String?` (no in-platform cost field — registration is external). `CoachingClinic` uses `costCents Int?` + `isFree Boolean` because clinics are coach-priced and may eventually support in-platform display. This difference is intentional.

**Import dedup:** Deduplication by `[importSource, externalId]` is enforced at the application level in `dedup.ts` (query before insert), not via a DB unique constraint. The reason: imported events may have missing `externalId` values, and a partial unique constraint would be complex. A `@@index([importSource, externalId])` is added for query performance.

### `UserEventPreference` (new model)

```prisma
model UserEventPreference {
  id              String   @id @default(cuid())
  userId          String   @unique
  homeLatitude    Decimal? @db.Decimal(10, 7)
  homeLongitude   Decimal? @db.Decimal(10, 7)
  searchRadius    Int      @default(100)       // km
  followedTypes   String[] @default([])
  newEventAlerts  Boolean  @default(true)
  reminderDays    Int      @default(3)
  resultsAlerts   Boolean  @default(true)
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_event_preferences")
}
```

### `OrganizerProfile` → field alignment

The monolith uses `OrganizerProfile` (table `organizer_profiles`) with field `orgName`. The standalone repo uses `EventOrganizer` with field `name`. **We keep the monolith model name `OrganizerProfile`** but align the fields. `orgName` is renamed to `name` via a Prisma migration (rename column, update all query references). Add missing fields:

```prisma
model OrganizerProfile {
  // orgName renamed to name
  name           String      // renamed from orgName
  description    String?     // added (was missing)
  contactEmail   String?     // added
  socialLinks    String[]    @default([])  // added
  isActive       Boolean     @default(true) // added (existing records default true)
  // all other existing fields retained
}
```

### `CoachProfile` additions

```prisma
model CoachProfile {
  // existing fields...
  latitude   Float?
  longitude  Float?
  clinics    CoachingClinic[]
}
```

Existing coaches are batch-geocoded from their `location` string via a one-time script (`scripts/geocode-coaches.ts`). New coaches are geocoded on profile save in `createOrganizerProfile` action.

### `CoachingClinic` (new model)

```prisma
model CoachingClinic {
  id          String      @id @default(cuid())
  coachId     String
  slug        String      @unique
  title       String
  description String?     @db.Text
  startDate   DateTime
  endDate     DateTime?
  location    String
  latitude    Float?
  longitude   Float?
  capacity    Int?
  costCents   Int?
  isFree      Boolean     @default(false)
  calcomLink  String?
  status      EventStatus @default(published)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  coach       CoachProfile @relation(fields: [coachId], references: [id], onDelete: Cascade)

  @@index([startDate, status])
  @@index([latitude, longitude])
  @@map("coaching_clinics")
}
```

### Environment variables

Add `MAPBOX_ACCESS_TOKEN` (server-side secret, distinct from `NEXT_PUBLIC_MAPBOX_TOKEN`) for server-side geocoding in `/api/geocode`, the import pipeline, and `scripts/geocode-coaches.ts`. The public token must not be used server-side in API routes. Add to Vercel env vars and `.env.local`.

### Cron jobs

Add 3 new cron jobs to `vercel.json`:

```json
{ "path": "/api/cron/events/reminders",     "schedule": "0 9 * * *" },
{ "path": "/api/cron/events/complete-past",  "schedule": "0 0 * * *" },
{ "path": "/api/cron/events/geocode",        "schedule": "0 2 * * *" }
```

This brings the total cron count to 9. The project is on Vercel Pro (supports up to 40 crons). All cron routes require `Authorization: Bearer ${CRON_SECRET}` header.

---

## Workstream 2 — UnifiedMap Component

A new shared module at `src/modules/map/`. Not owned by trails, events, or coaching — it is platform-level infrastructure.

### Component API

```tsx
<UnifiedMap
  defaultLayers={['events']}
  availableLayers={['trails', 'events', 'coaching']}
  className="h-full"
/>
```

- `defaultLayers` — which layers are active on mount
- `availableLayers` — which layers appear in the toggle panel
- Each page passes its own defaults; users can freely toggle any available layer on or off

### File structure

```
src/modules/map/
  components/
    UnifiedMap.tsx          # Mapbox init, layer orchestration, exports dynamic wrapper
    MapStyleSelector.tsx    # extracted from existing trails MapStyleSelector (renamed from SystemClusterMap's inline switcher — same name kept)
    LayerToggle.tsx         # floating panel with per-layer checkboxes + color swatches
    layers/
      TrailsLayer.tsx       # fetches /api/trails/map, renders trail system cluster pins
      EventsLayer.tsx       # fetches /api/events/map, renders event pins color-coded by type
      CoachesLayer.tsx      # fetches /api/coaching/map, renders coach + clinic pins
    popups/
      TrailSystemPopup.tsx  # name, trail count, link to /trails/explore/[slug]
      EventPopup.tsx        # title, date, discipline badge, RSVP count, link to event detail
      CoachPopup.tsx        # two-stage expandable (see below)
  hooks/
    useMapLayers.ts         # layer visibility state — Set<LayerName>, persisted to localStorage
  types/
    index.ts                # LayerName = 'trails' | 'events' | 'coaching'; MapPin types
  index.ts                  # exports UnifiedMapDynamic (next/dynamic, ssr: false)
```

### Data fetching per layer (client-side)

All three layers are client components that fetch their own data via API routes after mount. This avoids prop-drilling from server components into the client map and supports live toggling.

| Layer | API endpoint | Returns |
|-------|-------------|---------|
| TrailsLayer | `GET /api/trails/map` | `{ id, slug, name, city, state, latitude, longitude, trailCount }[]` |
| EventsLayer | `GET /api/events/map` | `{ id, slug, title, startDate, eventType, latitude, longitude, rsvpCount }[]` |
| CoachesLayer | `GET /api/coaching/map` | `{ coaches: CoachPin[], clinics: ClinicPin[] }` |

`/api/trails/map` is a new lightweight endpoint that returns only what the map needs (no GPS track data). The existing `/trails/map` server component currently fetches via `getTrailSystems({})` — it is updated to use this new endpoint pattern so the `TrailsLayer` client component can self-fetch.

### Layer details

**TrailsLayer**
- Trail system cluster pins (one pin per system, clustered at low zoom)
- Green pins, existing cluster behavior
- Click → popup with system name, trail count, "Explore Trails" link

**EventsLayer**
- Event pins fetched from `/api/events/map` (published future events with lat/lng only — events without coordinates are excluded)
- Clustered at low zoom
- Pin color by `EventType` discipline group:
  - Races (`race`, `race_xc`, `race_enduro`, `race_dh`, `race_marathon`, `race_other`): red `#ef4444`
  - Group rides: green `#22c55e`
  - Clinics/camps/skills (`clinic`, `camp`, `skills_clinic`): blue `#3b82f6`
  - Trail work: amber `#f59e0b`
  - Social/expo/demo/bike_park (`social`, `expo`, `demo_day`, `bike_park_day`): purple `#a855f7`
  - Virtual/other: gray `#6b7280`
- Popup: title, date, discipline badge (matching color), RSVP count, "View Event" link

**CoachesLayer**
- Two Mapbox sources within one layer toggle:
  - `coach-profiles` source: coach location pins (green circle marker)
  - `coaching-clinics` source: clinic session pins (blue square marker)
- **CoachPopup** — two-stage expandable:
  - Compact: name, top 2 specialties, hourly rate
  - Expanded (click "More info"): bio excerpt, certifications, "Book a Session" → `calcomLink`
- **ClinicPopup**: title, date, coach name, cost/free badge, remaining capacity, "Book This Clinic" → `calcomLink`

**LayerToggle**
- Floating panel, top-left of map
- One row per available layer: color swatch + label + checkbox
- Toggle state persisted to `localStorage` key `ride-mtb-map-layers` — survives page navigation

**MapStyleSelector**
- Extracted from the existing trail map's inline style switcher buttons (Standard/Satellite/Terrain/3D/3D Sat)
- Lives in `src/modules/map/components/MapStyleSelector.tsx`
- The existing `src/modules/trails/components/` version is removed and replaced with an import from the map module

### Map pages using UnifiedMap

| Page | defaultLayers | availableLayers |
|------|--------------|-----------------|
| `/trails/map` | `['trails']` | `['trails', 'events', 'coaching']` |
| `/events/map` | `['events']` | `['trails', 'events', 'coaching']` |
| `/coaching/map` | `['coaching']` | `['trails', 'events', 'coaching']` |

The existing `/trails/map` page is updated to use `<UnifiedMapDynamic>` instead of `<SystemClusterMapDynamic>`. `SystemClusterMap.tsx` is deleted after migration.

### New API endpoints for map data

| Route | Description |
|-------|-------------|
| `GET /api/trails/map` | Published trail systems with lat/lng (lightweight, map-only) |
| `GET /api/events/map` | Published future events with lat/lng and eventType |
| `GET /api/coaching/map` | Active coach profiles with lat/lng + upcoming clinics with lat/lng |

---

## Workstream 3 — Events Migration

Full port of the standalone `ride-mtb-events-race-calendar` repo into `src/modules/events/` and `src/app/events/`.

### New pages

| Route | Description |
|-------|-------------|
| `/events/map` | Full-screen `UnifiedMap`, `defaultLayers={['events']}`, `availableLayers` all three |
| `/events/search` | Dedicated search with URL params, cursor pagination |
| `/events/near-me` | Geolocation prompt → events within user's search radius (`UserEventPreference`) |
| `/events/my-events` | User's RSVPs grouped into upcoming/past with countdown badges |
| `/events/preferences` | Home location, search radius, followed disciplines, reminder days |
| `/events/submit` | User submission form → `status: pending_review` |
| `/admin/submissions` | Admin review queue for user-submitted events |
| `/admin/import` | Trigger BikeReg/USAC import, review dedup results |
| `/admin/organizers` | Verify/manage organizer profiles |

### New components (ported to `src/modules/events/components/`)

**Discovery**
- `EventFilterBar` — filter by type, difficulty, free/paid, date range
- `EventSplitView` — desktop: list + `UnifiedMap` (with `defaultLayers={['events']}`, `availableLayers={['events']}`) side-by-side; mobile: tabbed list/map. Uses `UnifiedMap` directly — no circular dependency since the map module has no dependency on events.
- `NearMePrompt` — geolocation permission request UI
- `SearchBar` — search input with debounce

**Event detail (richer than current)**
- `EventHero` — full-width cover image, title, key metadata
- `EventInfoGrid` — 2-col grid: date/time/location | registration/results/organizer
- `EventTypeBadge` — color-coded discipline label (same color mapping as `EventsLayer` pins)
- `DifficultyBadge` — difficulty level indicator
- `IcalDownload` — download `.ics` file
- `RelatedEvents` — "Similar events" row (same `eventType`, upcoming)
- `ResultsBanner` — shown when `resultsPosted = true`
- `AttendeeRow` — avatar stack + RSVP count

**My Events**
- `MyEventsList` — RSVPs grouped by upcoming/past
- `PastEventCard` — past event with share/results links

**Submission**
- `SubmitEventForm` — full submission form
- `LocationPicker` — address autocomplete (Mapbox geocoding via `NEXT_PUBLIC_MAPBOX_TOKEN`) + map preview. Reused by coaching clinic form.

**Admin**
- `SubmissionQueue` — pending_review list with approve/reject actions
- `ImportManager` — trigger import, view dedup results
- `OrganizerManager` — verify badge, block organizer

### New API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/events/search` | GET | Full-text search, cursor pagination |
| `/api/events/near` | GET | Haversine from user home coords + radius |
| `/api/events/map` | GET | Published future events with lat/lng for EventsLayer |
| `/api/geocode` | POST | Reverse geocode via Mapbox (`MAPBOX_ACCESS_TOKEN`, server-side secret) |
| `/api/import` | POST | Trigger BikeReg/USAC import pipeline |
| `/api/cron/events/reminders` | GET | Send reminder notifications, auth via `CRON_SECRET` |
| `/api/cron/events/complete-past` | GET | Mark past events as `completed` |
| `/api/cron/events/geocode` | GET | Batch geocode events missing coordinates |

### New server actions (in `src/modules/events/actions/`)

- `preferences.ts` — `getUserPreferences`, `updateUserPreferences`
- `submit.ts` — `submitEvent` (creates `pending_review` event + admin notification)
- `ical.ts` — `generateEventIcal` (returns `.ics` string)
- `admin.ts` (new file — does not exist yet) — `approveSubmission`, `rejectSubmission`, `verifyOrganizer`

### Import pipeline (`src/modules/events/lib/import/`)

- `bikereg.ts` — BikeReg event scraper/importer (sample data until API access)
- `usac.ts` — USAC race importer
- `dedup.ts` — application-level dedup: query by `[importSource, externalId]` before insert; no DB unique constraint (see schema section)

---

## Workstream 4 — Coaching Clinics

### New API route

| Route | Method | Description |
|-------|--------|-------------|
| `/api/coaching/map` | GET | Active coach profiles with lat/lng + upcoming clinics with lat/lng. Returns `{ coaches: { id, name, latitude, longitude, specialties, hourlyRate, calcomLink }[], clinics: { id, slug, title, startDate, latitude, longitude, costCents, isFree, calcomLink, coachName }[] }` |

### New pages

| Route | Description |
|-------|-------------|
| `/coaching/map` | Full-screen `UnifiedMap`, `defaultLayers={['coaching']}`, all layers available |
| `/coaching/clinics` | Browse upcoming clinics, filterable by specialty/location |
| `/coaching/clinics/[slug]` | Clinic detail: description, date, coach info, cost, booking link |
| `/coaching/dashboard/clinics` | Coach's clinic management list |
| `/coaching/dashboard/clinics/new` | Create clinic form (reuses `LocationPicker` from events) |
| `/coaching/dashboard/clinics/[id]/edit` | Edit clinic |

### New components (`src/modules/coaching/components/`)

- `CoachingClinicCard` — compact card for list/browse view (title, date, location, cost, coach name)
- `CoachingClinicForm` — create/edit form with `LocationPicker` + map preview
- `ClinicList` — filterable, paginated clinic list

### Booking flow

Clinics with `calcomLink` → "Book This Clinic" button linking to Cal.com. No in-platform payment. Clinics without a Cal.com link show coach contact info (email from `OrganizerProfile.contactEmail` or coach user email).

### Batch geocoding script

`scripts/geocode-coaches.ts` — iterates all `CoachProfile` records with non-null `location` but null `latitude`/`longitude`, calls Mapbox Geocoding API (`MAPBOX_ACCESS_TOKEN`), writes coordinates back. Run once after migration. New coaches geocoded on profile save via server action.

---

## Data Flow: Layer Toggle → Map Pins

```
User toggles EventsLayer ON
  → useMapLayers updates Set<LayerName> (persisted to localStorage)
  → UnifiedMap passes active layers down to layer components
  → EventsLayer mounts, fetches GET /api/events/map
  → Mapbox source + layer added with color-coded pins by eventType
  → User clicks pin → EventPopup renders
  → "View Event" → navigates to /events/[slug]

User toggles CoachesLayer ON (all three layers now active)
  → CoachesLayer mounts, fetches GET /api/coaching/map
  → Two Mapbox sources added: coach-profiles + coaching-clinics
  → Two pin styles rendered simultaneously on same map
  → Click coach pin → CoachPopup compact view
  → Click "More info" → CoachPopup expanded view with booking link
```

---

## Out of Scope

- In-platform payment processing for clinics (Cal.com handles this)
- Real-time RSVP updates (WebSockets) — server revalidation sufficient
- Email delivery for event notifications (DB records created; email integration is a future feature)
- BikeReg/USAC live API access (pipeline scaffolded but uses sample data)
- A standalone top-level `/map` route — each section keeps its own map page

---

## Success Criteria

1. `/events/map`, `/events/near-me`, `/events/my-events`, `/events/preferences`, `/events/submit` all functional
2. `/coaching/map` and `/coaching/clinics` functional
3. All three map pages (`/trails/map`, `/events/map`, `/coaching/map`) use `UnifiedMap` — toggling all layers simultaneously works correctly
4. Existing `/trails/map` updated to use `UnifiedMap` with no visual regressions
5. Admin submission queue, import UI, and organizer verification working
6. Schema migration runs cleanly against production Supabase (no broken rows from EventType expansion)
7. `MAPBOX_ACCESS_TOKEN` server-side secret configured in Vercel and `.env.local`
8. 3 new cron jobs registered in `vercel.json`
9. Existing events, trails, and coaching pages unaffected
