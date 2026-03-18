# Events Migration + Unified Map Design

**Goal:** Migrate the full-featured events module from the standalone `ride-mtb-events-race-calendar` repo into the monolith, build a shared `UnifiedMap` component with a layer toggle system for trails/events/coaching, and add coaching clinics as a new schedulable entity with map support.

**Architecture:** Three parallel workstreams — schema first, then the UnifiedMap component, then the events migration and coaching clinics features. The events map IS the EventsLayer inside UnifiedMap — built once, not twice.

**Tech Stack:** Next.js 15.5.12, Prisma v7, PostgreSQL (Supabase), Tailwind CSS v4, Mapbox GL JS v3, NextAuth v5, next-intl, Cal.com (coaching booking)

---

## Workstream 1 — Schema

Done first. All other workstreams depend on it.

### Event model additions

The monolith's `Event` model has a partial port (noted by `// New fields from race calendar port` comment). Complete the migration by adding all remaining fields from the standalone repo:

```prisma
model Event {
  // existing fields...

  // Location (structured)
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

  // Registration
  registrationDeadline DateTime?

  // Engagement (denormalized counters)
  viewCount            Int      @default(0)
  commentCount         Int      @default(0)
  rsvpCount            Int      @default(0)

  // Results
  resultsUrl           String?
  resultsPosted        Boolean  @default(false)

  // External import tracking
  importSource         String?
  externalId           String?

  // Cleanup: remove eventTypeEnum (conflicting partial port field)
}
```

Remove the `eventTypeEnum` and raw `costCents` fields added during the incomplete port — superseded by `isFree`/`registrationUrl` pattern from the standalone repo.

### EventType enum expansion

Expand from 7 → 14 types to match the standalone repo:

```prisma
enum EventType {
  group_ride
  race_xc
  race_enduro
  race_dh
  race_marathon
  race_other
  skills_clinic
  camp
  clinic
  expo
  trail_work
  virtual_challenge
  demo_day
  social
  other
}
```

### UserEventPreference (new model)

```prisma
model UserEventPreference {
  id              String   @id @default(cuid())
  userId          String   @unique
  homeLatitude    Decimal? @db.Decimal(10, 7)
  homeLongitude   Decimal? @db.Decimal(10, 7)
  searchRadius    Int      @default(100)
  followedTypes   String[] @default([])
  newEventAlerts  Boolean  @default(true)
  reminderDays    Int      @default(3)
  resultsAlerts   Boolean  @default(true)
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_event_preferences")
}
```

### CoachProfile additions

Add geocoded coordinates to the existing `CoachProfile` model:

```prisma
model CoachProfile {
  // existing fields...
  latitude   Float?
  longitude  Float?
  // existing relations...
  clinics    CoachingClinic[]
}
```

Existing coaches are batch-geocoded from their `location` string via a one-time migration script.

### CoachingClinic (new model)

```prisma
model CoachingClinic {
  id          String        @id @default(cuid())
  coachId     String
  slug        String        @unique
  title       String
  description String?       @db.Text
  startDate   DateTime
  endDate     DateTime?
  location    String
  latitude    Float?
  longitude   Float?
  capacity    Int?
  costCents   Int?
  isFree      Boolean       @default(false)
  calcomLink  String?
  status      ContentStatus @default(published)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  coach       CoachProfile  @relation(fields: [coachId], references: [id], onDelete: Cascade)

  @@index([startDate, status])
  @@index([latitude, longitude])
  @@map("coaching_clinics")
}
```

### OrganizerProfile additions

Add missing fields to align with the standalone repo's richer organizer model:

```prisma
model OrganizerProfile {
  // existing fields...
  description    String?
  contactEmail   String?
  socialLinks    String[] @default([])
  isActive       Boolean  @default(true)
}
```

---

## Workstream 2 — UnifiedMap Component

A new shared module at `src/modules/map/`. Not owned by trails, events, or coaching — it's platform-level infrastructure.

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
- Each page passes its own defaults; users can freely toggle any available layer

### File structure

```
src/modules/map/
  components/
    UnifiedMap.tsx          # Mapbox init, style switcher, layer orchestration
    LayerToggle.tsx         # floating panel with per-layer checkboxes
    layers/
      TrailsLayer.tsx       # ports existing SystemClusterMap logic
      EventsLayer.tsx       # event pins, color-coded by EventType
      CoachesLayer.tsx      # coach profile pins + clinic session pins
    popups/
      TrailSystemPopup.tsx  # trail system popup (name, trail count, link)
      EventPopup.tsx        # event popup (title, date, RSVP count, link)
      CoachPopup.tsx        # two-stage expandable (see below)
  hooks/
    useMapLayers.ts         # layer visibility state (Set<LayerName>)
  types/
    index.ts                # LayerName, MapPin, etc.
  index.ts
```

### Layer details

**TrailsLayer**
- Ports the existing `SystemClusterMap` logic. Trail system pins clustered at low zoom.
- Pin click → `/trails/explore/[slug]`
- Pin color: single green (existing behavior)

**EventsLayer**
- Event pins fetched from `/api/events/map` (returns published future events with lat/lng)
- Clustered at low zoom, expand on zoom in
- Pin color coded by EventType discipline:
  - Races (xc/enduro/dh/marathon/other): red family (`#ef4444`)
  - Group rides: green (`#22c55e`)
  - Clinics/camps: blue (`#3b82f6`)
  - Trail work: amber (`#f59e0b`)
  - Social/expo/demo: purple (`#a855f7`)
  - Virtual/other: gray (`#6b7280`)
- Popup: event title, date, discipline badge, RSVP count, link to event detail

**CoachesLayer**
- Two pin types within one layer toggle:
  - Coach profile pins: coach's general location. Green circle marker with coach avatar.
  - Clinic session pins: specific date/location events. Blue square marker.
- Coach popup is two-stage expandable:
  - **Compact:** name, top 2 specialties, hourly rate
  - **Expanded** (click "More info"): bio excerpt, certifications, "Book a Session" → `calcomLink`
- Clinic popup: title, date, coach name, cost/free badge, remaining capacity, "Book This Clinic" → `calcomLink`

**LayerToggle**
- Floating panel, top-left of map
- One checkbox row per available layer with color swatch and label
- Persisted to `localStorage` so user preference survives navigation

### Style switcher

Reuses the existing Standard/Satellite/Terrain/3D/3D Sat switcher from the trails map — extracted into a shared `MapStyleSwitcher` component inside this module.

### Map pages using UnifiedMap

| Page | defaultLayers | availableLayers |
|------|--------------|-----------------|
| `/trails/map` | `['trails']` | `['trails', 'events', 'coaching']` |
| `/events/map` | `['events']` | `['trails', 'events', 'coaching']` |
| `/coaching/map` | `['coaching']` | `['trails', 'events', 'coaching']` |

The existing `/trails/map` page is updated to use `UnifiedMap` instead of `SystemClusterMapDynamic`.

---

## Workstream 3 — Events Migration

Full port of the standalone `ride-mtb-events-race-calendar` repo into `src/modules/events/` and `src/app/events/`.

### New pages

| Route | Description |
|-------|-------------|
| `/events/map` | Full-screen `UnifiedMap`, `defaultLayers={['events']}` |
| `/events/search` | Dedicated search with URL params, cursor pagination |
| `/events/near-me` | Geolocation prompt → events within user's search radius (uses `UserEventPreference`) |
| `/events/my-events` | User's RSVPs grouped into upcoming/past, countdown badges |
| `/events/preferences` | Home location, search radius, followed disciplines, reminder days |
| `/events/submit` | User submission form → `status: pending_review` |
| `/admin/submissions` | Admin review queue for user-submitted events |
| `/admin/import` | Trigger BikeReg/USAC import, review dedup results |
| `/admin/organizers` | Verify/manage organizer profiles |

### New components (ported to `src/modules/events/components/`)

**Discovery**
- `EventFilterBar` — filter by type, difficulty, free/paid, date range
- `EventSplitView` — desktop: list + map side-by-side; mobile: tabbed
- `NearMePrompt` — geolocation permission request UI
- `SearchBar` — search input with debounce

**Event detail (richer than current)**
- `EventHero` — full-width cover image + title + key metadata
- `EventInfoGrid` — 2-col grid: date/time/location | registration/results/organizer
- `EventTypeBadge` — color-coded discipline label (matches EventsLayer colors)
- `DifficultyBadge` — difficulty level indicator
- `IcalDownload` — download `.ics` file
- `RelatedEvents` — "Similar events" row
- `ResultsBanner` — shown when `resultsPosted = true`
- `AttendeeRow` — avatar stack + RSVP count

**My Events**
- `MyEventsList` — RSVPs grouped by upcoming/past
- `PastEventCard` — past event with share/results links

**Submission**
- `SubmitEventForm` — full submission form
- `LocationPicker` — address autocomplete (Mapbox geocoding) + map preview (reused by coaching clinic form)

**Admin**
- `SubmissionQueue` — pending review list with approve/reject actions
- `ImportManager` — trigger import, view dedup results
- `OrganizerManager` — verify badge, block organizer

### New API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/events/search` | GET | Full-text search, cursor pagination |
| `/api/events/near` | GET | Haversine from user home coords + radius |
| `/api/events/map` | GET | Published future events with lat/lng for EventsLayer |
| `/api/geocode` | POST | Reverse geocode via Mapbox (used by LocationPicker + import) |
| `/api/import` | POST | Trigger BikeReg/USAC import pipeline |
| `/api/cron/events/reminders` | GET | Send reminder notifications, auth via `CRON_SECRET` |
| `/api/cron/events/complete-past` | GET | Mark past events as `completed` |
| `/api/cron/events/geocode` | GET | Batch geocode events missing coordinates |

### New server actions (in `src/modules/events/actions/`)

- `preferences.ts` — `getUserPreferences`, `updateUserPreferences`
- `submit.ts` — `submitEvent` (creates pending_review event + admin notification)
- `ical.ts` — `generateEventIcal` (returns `.ics` file content)
- Expand `admin.ts` — `approveSubmission`, `rejectSubmission`, `verifyOrganizer`

### Import pipeline (`src/modules/events/lib/import/`)

- `bikereg.ts` — BikeReg event scraper/importer
- `usac.ts` — USAC race importer
- `dedup.ts` — deduplication by `[importSource, externalId]` unique constraint
- Imported events auto-geocoded via `/api/cron/events/geocode`

---

## Workstream 4 — Coaching Clinics

### New pages

| Route | Description |
|-------|-------------|
| `/coaching/map` | Full-screen `UnifiedMap`, `defaultLayers={['coaching']}` |
| `/coaching/clinics` | Browse upcoming clinics, filterable by specialty/location |
| `/coaching/clinics/[slug]` | Clinic detail: description, date, coach info, cost, booking |
| `/coaching/dashboard/clinics` | Coach's clinic management list |
| `/coaching/dashboard/clinics/new` | Create clinic form (reuses `LocationPicker`) |
| `/coaching/dashboard/clinics/[id]/edit` | Edit clinic |

### New components (added to `src/modules/coaching/components/`)

- `CoachingClinicCard` — compact card for list/browse view
- `CoachingClinicForm` — create/edit form with `LocationPicker` + map preview
- `ClinicList` — filterable, paginated clinic list

### Booking flow

Clinics with a `calcomLink` → "Book This Clinic" button linking to Cal.com. No in-platform payment processing. If no Cal.com link, shows coach contact info instead.

### Batch geocoding script

One-time script (`scripts/geocode-coaches.ts`) that iterates all `CoachProfile` records with a non-null `location` string but null `latitude`/`longitude`, calls the Mapbox Geocoding API, and writes coordinates back. Run once after the migration, then new coaches are geocoded on profile save.

---

## Data Flow: Layer Toggle → Map Pins

```
User toggles EventsLayer ON
  → useMapLayers updates Set<LayerName>
  → UnifiedMap passes active layers to each layer component
  → EventsLayer mounts, fetches /api/events/map
  → Mapbox source + layer added with color-coded pins
  → User clicks pin → EventPopup renders with event data

User toggles CoachesLayer ON (same map, now showing all three)
  → CoachesLayer mounts, fetches /api/coaching/map
  → Two Mapbox sources: coach-profiles + coaching-clinics
  → Two pin styles rendered simultaneously
  → Click coach pin → CoachPopup (compact) → expand → booking link
```

---

## Out of Scope

- In-platform payment processing for clinics (Cal.com handles this)
- Real-time RSVP updates (WebSockets) — polling/revalidation sufficient
- Email delivery for event notifications (DB notification records created; email integration is a future feature)
- BikeReg/USAC live API access (import pipeline scaffolded but uses sample data until API keys obtained)
- A standalone `/map` top-level route — each section keeps its own map page

---

## Success Criteria

1. `/events/map`, `/events/near-me`, `/events/my-events`, `/events/preferences`, `/events/submit` all functional
2. `/coaching/map` and `/coaching/clinics` functional
3. All three map pages use `UnifiedMap` — toggling all layers simultaneously works correctly
4. Existing `/trails/map` page updated to use `UnifiedMap` with no regressions
5. Admin submission queue, import UI, and organizer verification working
6. Schema migration runs cleanly against production Supabase
7. Existing events, trails, and coaching pages unaffected
