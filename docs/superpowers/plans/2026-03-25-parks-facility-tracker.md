# Parks & Facility Tracker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add skatepark, pump track, and bike park tracking to the Ride MTB monolith — data from OSM, surfaced on the trails map and a new `/parks` directory.

**Architecture:** Single `Facility` Prisma model synced from OpenStreetMap via admin-triggered action; three new map layers on the existing `UnifiedMapDynamic`; `/parks` directory with state grid → state list → detail pages; community reviews + photos with Claude-powered moderation.

**Tech Stack:** Prisma v7, Supabase (PostgreSQL + Storage), Mapbox GL JS, `@anthropic-ai/sdk` (claude-haiku-4-5), `piexifjs` (EXIF stripping), Next.js App Router (Server Components + Server Actions + Route Handlers)

---

## File Map

### New files
```
prisma/migrations/...                                — DB migration
src/modules/parks/
  types/index.ts                                     — FacilityPin, FacilityWithReviews, etc.
  lib/overpass.ts                                    — Overpass query helpers
  lib/moderation.ts                                  — Claude text + Vision screening
  lib/exif.ts                                        — EXIF stripping via piexifjs
  actions/sync.ts                                    — syncFacilitiesFromOSM, getSyncState
  actions/facilities.ts                              — getFacilitiesByType, getFacilityBySlug, etc.
  actions/reviews.ts                                 — submitFacilityReview
  actions/photos.ts                                  — uploadFacilityPhoto, approve, reject, delete
  components/FacilityCard.tsx                        — Card for state list page
  components/FacilityDetail.tsx                      — Full detail view
  components/ReviewForm.tsx                          — Star rating + text form
  components/ReviewList.tsx                          — Paginated review list
  components/PhotoGallery.tsx                        — Approved photos grid
  components/PhotoUpload.tsx                         — Upload form
src/modules/map/components/layers/
  FacilityLayer.tsx                                  — Shared factory layer component
  SkateparksLayer.tsx                                — Thin wrapper: type=skateparks
  PumpTracksLayer.tsx                                — Thin wrapper: type=pumptracks
  BikeParksLayer.tsx                                 — Thin wrapper: type=bikeparks
src/app/api/facilities/
  route.ts                                           — GET ?type=... → FacilityPin[]
src/app/parks/
  page.tsx                                           — State grid
  [state]/
    page.tsx                                         — Facility list + type filter
    [slug]/
      page.tsx                                       — Facility detail
src/app/admin/parks/
  page.tsx                                           — Sync panel + stats
  photos/
    page.tsx                                         — Photo moderation queue
```

### Modified files
```
prisma/schema.prisma                                 — Add Facility, FacilityReview, FacilityPhoto, SyncState, FacilityType, FacilityPhotoStatus
src/modules/map/types/index.ts                       — Extend LayerName union
src/modules/map/components/LayerToggle.tsx           — Add 3 entries to LAYER_COLORS + LAYER_LABELS
src/modules/map/components/UnifiedMap.tsx            — Import + render 3 new layers
src/app/trails/map/page.tsx                          — Add 3 new availableLayers
src/app/admin/layout.tsx                             — Add Parks nav link
```

---

## Task 1: DB Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/...` (auto-generated)

- [ ] **Step 1: Open schema and add models**

In `prisma/schema.prisma`, add after the existing models:

```prisma
model Facility {
  id            String       @id @default(cuid())
  osmId         String       @unique
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

model FacilityReview {
  id         String   @id @default(cuid())
  facilityId String
  userId     String
  rating     Int
  body       String?  @db.Text
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  facility   Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([facilityId, userId])
  @@index([facilityId])
}

model FacilityPhoto {
  id         String              @id @default(cuid())
  facilityId String
  userId     String
  storageKey String
  caption    String?
  status     FacilityPhotoStatus @default(PENDING)
  aiVerdict  String?
  createdAt  DateTime            @default(now())

  facility   Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([facilityId, status])
  @@index([status, createdAt])
}

enum FacilityPhotoStatus {
  PENDING
  APPROVED
  REJECTED
}

model SyncState {
  id             String    @id @default("parks-sync")
  syncInProgress Boolean   @default(false)
  lastSyncedAt   DateTime?
  lastSyncResult Json?
}
```

Also add to the `User` model (find the User model and add these relations):
```prisma
  facilityReviews FacilityReview[]
  facilityPhotos  FacilityPhoto[]
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma migrate dev --name add_parks_facility_tracker
```

Expected: Migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Verify in Prisma Studio (optional quick check)**

```bash
npx prisma studio
```

Confirm Facility, FacilityReview, FacilityPhoto, SyncState tables exist.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Facility, FacilityReview, FacilityPhoto, SyncState schema for parks tracker"
```

---

## Task 2: Parks Module Types + Overpass Helpers

**Files:**
- Create: `src/modules/parks/types/index.ts`
- Create: `src/modules/parks/lib/overpass.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/modules/parks/types/index.ts

export type FacilityType = 'SKATEPARK' | 'PUMPTRACK' | 'BIKEPARK'
export type FacilityPhotoStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface FacilityPin {
  id: string
  osmId: string
  type: FacilityType
  name: string
  slug: string
  latitude: number
  longitude: number
  city: string | null
  state: string | null
  stateSlug: string | null
  surface: string | null
  lit: boolean | null
  avgRating: number | null
  reviewCount: number
}

export interface FacilityWithStats {
  id: string
  osmId: string
  type: FacilityType
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  state: string | null
  stateSlug: string | null
  operator: string | null
  openingHours: string | null
  surface: string | null
  website: string | null
  phone: string | null
  lit: boolean | null
  fee: boolean | null
  description: string | null
  lastSyncedAt: Date | null
  avgRating: number | null
  reviewCount: number
}

export interface StateStats {
  stateSlug: string
  stateName: string
  count: number
}

export interface OsmFacility {
  osmId: string
  type: FacilityType
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  state: string | null
  stateSlug: string | null
  operator: string | null
  openingHours: string | null
  surface: string | null
  website: string | null
  phone: string | null
  lit: boolean | null
  fee: boolean | null
  metadata: Record<string, string>
}
```

- [ ] **Step 2: Create overpass.ts**

```typescript
// src/modules/parks/lib/overpass.ts

import type { FacilityType, OsmFacility } from '../types'

const US_BBOX = '24.396308,-124.848974,49.384358,-66.885444'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const TIMEOUT_MS = 60_000

export const FACILITY_QUERIES: Array<{ type: FacilityType; label: string; query: string }> = [
  {
    type: 'SKATEPARK',
    label: 'Skateparks',
    query: `[out:json][timeout:60];(way["sport"="skateboard"](${US_BBOX});relation["sport"="skateboard"](${US_BBOX}););out center tags;`,
  },
  {
    type: 'PUMPTRACK',
    label: 'Pump Tracks',
    query: `[out:json][timeout:60];(way["cycling"="pump_track"](${US_BBOX});way["mtb:type"="pumptrack"](${US_BBOX});relation["cycling"="pump_track"](${US_BBOX});relation["mtb:type"="pumptrack"](${US_BBOX}););out center tags;`,
  },
  {
    type: 'BIKEPARK',
    label: 'Bike Parks',
    query: `[out:json][timeout:60];(way["leisure"="bikepark"](${US_BBOX});relation["leisure"="bikepark"](${US_BBOX}););out center tags;`,
  },
]

export async function runOverpassQuery(query: string): Promise<unknown[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`)
    const json = await res.json() as { elements: unknown[] }
    return json.elements ?? []
  } finally {
    clearTimeout(timer)
  }
}

export function buildOsmId(element: { type: string; id: number }): string {
  const prefix = element.type === 'relation' ? 'r' : 'w'
  return `${prefix}${element.id}`
}

export function getCenter(element: {
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
}): { lat: number; lon: number } | null {
  if (element.type === 'way' && element.center) {
    return element.center
  }
  if (element.lat != null && element.lon != null) {
    return { lat: element.lat, lon: element.lon }
  }
  return null
}

export function buildSlug(name: string, osmId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '')
  return `${base}-${osmId}`
}

// Maps OSM addr:state abbreviations to full slugs
export const STATE_SLUG_MAP: Record<string, { name: string; slug: string }> = {
  AL: { name: 'Alabama', slug: 'alabama' },
  AK: { name: 'Alaska', slug: 'alaska' },
  AZ: { name: 'Arizona', slug: 'arizona' },
  AR: { name: 'Arkansas', slug: 'arkansas' },
  CA: { name: 'California', slug: 'california' },
  CO: { name: 'Colorado', slug: 'colorado' },
  CT: { name: 'Connecticut', slug: 'connecticut' },
  DE: { name: 'Delaware', slug: 'delaware' },
  FL: { name: 'Florida', slug: 'florida' },
  GA: { name: 'Georgia', slug: 'georgia' },
  HI: { name: 'Hawaii', slug: 'hawaii' },
  ID: { name: 'Idaho', slug: 'idaho' },
  IL: { name: 'Illinois', slug: 'illinois' },
  IN: { name: 'Indiana', slug: 'indiana' },
  IA: { name: 'Iowa', slug: 'iowa' },
  KS: { name: 'Kansas', slug: 'kansas' },
  KY: { name: 'Kentucky', slug: 'kentucky' },
  LA: { name: 'Louisiana', slug: 'louisiana' },
  ME: { name: 'Maine', slug: 'maine' },
  MD: { name: 'Maryland', slug: 'maryland' },
  MA: { name: 'Massachusetts', slug: 'massachusetts' },
  MI: { name: 'Michigan', slug: 'michigan' },
  MN: { name: 'Minnesota', slug: 'minnesota' },
  MS: { name: 'Mississippi', slug: 'mississippi' },
  MO: { name: 'Missouri', slug: 'missouri' },
  MT: { name: 'Montana', slug: 'montana' },
  NE: { name: 'Nebraska', slug: 'nebraska' },
  NV: { name: 'Nevada', slug: 'nevada' },
  NH: { name: 'New Hampshire', slug: 'new-hampshire' },
  NJ: { name: 'New Jersey', slug: 'new-jersey' },
  NM: { name: 'New Mexico', slug: 'new-mexico' },
  NY: { name: 'New York', slug: 'new-york' },
  NC: { name: 'North Carolina', slug: 'north-carolina' },
  ND: { name: 'North Dakota', slug: 'north-dakota' },
  OH: { name: 'Ohio', slug: 'ohio' },
  OK: { name: 'Oklahoma', slug: 'oklahoma' },
  OR: { name: 'Oregon', slug: 'oregon' },
  PA: { name: 'Pennsylvania', slug: 'pennsylvania' },
  RI: { name: 'Rhode Island', slug: 'rhode-island' },
  SC: { name: 'South Carolina', slug: 'south-carolina' },
  SD: { name: 'South Dakota', slug: 'south-dakota' },
  TN: { name: 'Tennessee', slug: 'tennessee' },
  TX: { name: 'Texas', slug: 'texas' },
  UT: { name: 'Utah', slug: 'utah' },
  VT: { name: 'Vermont', slug: 'vermont' },
  VA: { name: 'Virginia', slug: 'virginia' },
  WA: { name: 'Washington', slug: 'washington' },
  WV: { name: 'West Virginia', slug: 'west-virginia' },
  WI: { name: 'Wisconsin', slug: 'wisconsin' },
  WY: { name: 'Wyoming', slug: 'wyoming' },
  DC: { name: 'Washington DC', slug: 'washington-dc' },
}

export function parseOsmElement(
  element: Record<string, unknown>,
  facilityType: FacilityType,
): OsmFacility | null {
  const tags = (element.tags ?? {}) as Record<string, string>
  const osmId = buildOsmId(element as { type: string; id: number })
  const center = getCenter(element as Parameters<typeof getCenter>[0])
  if (!center) return null

  const name = tags.name ?? tags['name:en'] ?? ''
  if (!name) return null

  const stateAbbr = tags['addr:state'] ?? null
  const stateInfo = stateAbbr ? (STATE_SLUG_MAP[stateAbbr.toUpperCase()] ?? null) : null

  const litTag = tags.lit
  const feeTag = tags.fee

  return {
    osmId,
    type: facilityType,
    name,
    slug: buildSlug(name, osmId),
    latitude: center.lat,
    longitude: center.lon,
    address: tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : null,
    city: tags['addr:city'] ?? null,
    state: stateInfo?.name ?? null,
    stateSlug: stateInfo?.slug ?? null,
    operator: tags.operator ?? null,
    openingHours: tags.opening_hours ?? null,
    surface: tags.surface ?? null,
    website: tags.website ?? tags.url ?? null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    lit: litTag === 'yes' ? true : litTag === 'no' ? false : null,
    fee: feeTag === 'yes' ? true : feeTag === 'no' ? false : null,
    metadata: tags,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/parks/types/index.ts src/modules/parks/lib/overpass.ts
git commit -m "feat: parks module types and Overpass query helpers"
```

---

## Task 3: OSM Sync Action

**Files:**
- Create: `src/modules/parks/actions/sync.ts`

- [ ] **Step 1: Create sync action**

```typescript
// src/modules/parks/actions/sync.ts
'use server'

import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { FACILITY_QUERIES, runOverpassQuery, parseOsmElement } from '../lib/overpass'

export async function getSyncState() {
  return db.syncState.upsert({
    where: { id: 'parks-sync' },
    create: { id: 'parks-sync' },
    update: {},
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function syncFacilitiesFromOSM(): Promise<{
  added: number
  updated: number
}> {
  await requireAdmin()

  const syncState = await db.syncState.findUnique({ where: { id: 'parks-sync' } })
  if (syncState?.syncInProgress) {
    throw new Error('Sync already in progress')
  }

  await db.syncState.upsert({
    where: { id: 'parks-sync' },
    create: { id: 'parks-sync', syncInProgress: true },
    update: { syncInProgress: true },
  })

  let added = 0
  let updated = 0

  try {
    for (let i = 0; i < FACILITY_QUERIES.length; i++) {
      if (i > 0) await sleep(2000)

      const { type, query } = FACILITY_QUERIES[i]
      const elements = await runOverpassQuery(query)

      for (const element of elements) {
        const facility = parseOsmElement(element as Record<string, unknown>, type)
        if (!facility) continue

        const existing = await db.facility.findUnique({ where: { osmId: facility.osmId } })

        await db.facility.upsert({
          where: { osmId: facility.osmId },
          create: {
            osmId: facility.osmId,
            type: facility.type,
            name: facility.name,
            slug: facility.slug,
            latitude: facility.latitude,
            longitude: facility.longitude,
            address: facility.address,
            city: facility.city,
            state: facility.state,
            stateSlug: facility.stateSlug,
            operator: facility.operator,
            openingHours: facility.openingHours,
            surface: facility.surface,
            website: facility.website,
            phone: facility.phone,
            lit: facility.lit,
            fee: facility.fee,
            metadata: facility.metadata,
            lastSyncedAt: new Date(),
          },
          update: {
            name: facility.name,
            latitude: facility.latitude,
            longitude: facility.longitude,
            address: facility.address,
            city: facility.city,
            state: facility.state,
            stateSlug: facility.stateSlug,
            operator: facility.operator,
            openingHours: facility.openingHours,
            surface: facility.surface,
            website: facility.website,
            phone: facility.phone,
            lit: facility.lit,
            fee: facility.fee,
            metadata: facility.metadata,
            lastSyncedAt: new Date(),
          },
        })

        if (existing) {
          updated++
        } else {
          added++
        }
      }
    }

    const result = { added, updated }
    await db.syncState.update({
      where: { id: 'parks-sync' },
      data: {
        syncInProgress: false,
        lastSyncedAt: new Date(),
        lastSyncResult: result,
      },
    })
    return result
  } catch (err) {
    await db.syncState.update({
      where: { id: 'parks-sync' },
      data: {
        syncInProgress: false,
        lastSyncResult: { error: err instanceof Error ? err.message : 'Unknown error' },
      },
    })
    throw err
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/parks/actions/sync.ts
git commit -m "feat: syncFacilitiesFromOSM server action with SyncState guard"
```

---

## Task 4: Facility Query Actions

**Files:**
- Create: `src/modules/parks/actions/facilities.ts`

- [ ] **Step 1: Create query actions**

```typescript
// src/modules/parks/actions/facilities.ts
'use server'

// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import type { FacilityType, FacilityPin, FacilityWithStats, StateStats } from '../types'

const TYPE_MAP: Record<string, FacilityType> = {
  skateparks: 'SKATEPARK',
  pumptracks: 'PUMPTRACK',
  bikeparks: 'BIKEPARK',
}

export async function getFacilitiesByType(typeParam: string): Promise<FacilityPin[]> {
  const type = TYPE_MAP[typeParam]
  if (!type) return []

  const facilities = await db.facility.findMany({
    where: { type },
    select: {
      id: true,
      osmId: true,
      type: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      stateSlug: true,
      surface: true,
      lit: true,
      _count: { select: { reviews: true } },
      reviews: { select: { rating: true } },
    },
  })

  return facilities.map((f) => {
    const ratings = f.reviews.map((r) => r.rating)
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return {
      id: f.id,
      osmId: f.osmId,
      type: f.type as FacilityType,
      name: f.name,
      slug: f.slug,
      latitude: f.latitude,
      longitude: f.longitude,
      city: f.city,
      state: f.state,
      stateSlug: f.stateSlug,
      surface: f.surface,
      lit: f.lit,
      avgRating,
      reviewCount: f._count.reviews,
    }
  })
}

export async function getFacilitiesByState(
  stateSlug: string,
  type?: FacilityType,
): Promise<FacilityPin[]> {
  const facilities = await db.facility.findMany({
    where: { stateSlug, ...(type ? { type } : {}) },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      osmId: true,
      type: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      stateSlug: true,
      surface: true,
      lit: true,
      _count: { select: { reviews: true } },
      reviews: { select: { rating: true } },
    },
  })

  return facilities.map((f) => {
    const ratings = f.reviews.map((r) => r.rating)
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return {
      id: f.id,
      osmId: f.osmId,
      type: f.type as FacilityType,
      name: f.name,
      slug: f.slug,
      latitude: f.latitude,
      longitude: f.longitude,
      city: f.city,
      state: f.state,
      stateSlug: f.stateSlug,
      surface: f.surface,
      lit: f.lit,
      avgRating,
      reviewCount: f._count.reviews,
    }
  })
}

export async function getFacilityBySlug(slug: string): Promise<FacilityWithStats | null> {
  const facility = await db.facility.findUnique({
    where: { slug },
    include: {
      _count: { select: { reviews: true } },
      reviews: { select: { rating: true } },
    },
  })
  if (!facility) return null

  const ratings = facility.reviews.map((r) => r.rating)
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null

  return {
    id: facility.id,
    osmId: facility.osmId,
    type: facility.type as FacilityType,
    name: facility.name,
    slug: facility.slug,
    latitude: facility.latitude,
    longitude: facility.longitude,
    address: facility.address,
    city: facility.city,
    state: facility.state,
    stateSlug: facility.stateSlug,
    operator: facility.operator,
    openingHours: facility.openingHours,
    surface: facility.surface,
    website: facility.website,
    phone: facility.phone,
    lit: facility.lit,
    fee: facility.fee,
    description: facility.description,
    lastSyncedAt: facility.lastSyncedAt,
    avgRating,
    reviewCount: facility._count.reviews,
  }
}

export async function getStateStats(): Promise<StateStats[]> {
  const rows = await db.facility.groupBy({
    by: ['stateSlug', 'state'],
    _count: { id: true },
    where: { stateSlug: { not: null } },
    orderBy: { stateSlug: 'asc' },
  })

  return rows
    .filter((r) => r.stateSlug && r.state)
    .map((r) => ({
      stateSlug: r.stateSlug!,
      stateName: r.state!,
      count: r._count.id,
    }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/parks/actions/facilities.ts
git commit -m "feat: facility query actions (by type, state, slug, state stats)"
```

---

## Task 5: API Route + Map Layer Components

**Files:**
- Create: `src/app/api/facilities/route.ts`
- Create: `src/modules/map/components/layers/FacilityLayer.tsx`
- Create: `src/modules/map/components/layers/SkateparksLayer.tsx`
- Create: `src/modules/map/components/layers/PumpTracksLayer.tsx`
- Create: `src/modules/map/components/layers/BikeParksLayer.tsx`
- Modify: `src/modules/map/types/index.ts`
- Modify: `src/modules/map/components/LayerToggle.tsx`
- Modify: `src/modules/map/components/UnifiedMap.tsx`
- Modify: `src/app/trails/map/page.tsx`

- [ ] **Step 1: Create API route**

```typescript
// src/app/api/facilities/route.ts
import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const TYPE_MAP: Record<string, string> = {
  skateparks: 'SKATEPARK',
  pumptracks: 'PUMPTRACK',
  bikeparks: 'BIKEPARK',
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const prismaType = type ? TYPE_MAP[type] : null
  if (!prismaType) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const facilities = await db.facility.findMany({
    where: { type: prismaType as 'SKATEPARK' | 'PUMPTRACK' | 'BIKEPARK' },
    select: {
      id: true,
      osmId: true,
      type: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      stateSlug: true,
      surface: true,
      lit: true,
      reviews: { select: { rating: true } },
    },
  })

  const pins = facilities.map((f) => {
    const ratings = f.reviews.map((r) => r.rating)
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return {
      id: f.id,
      osmId: f.osmId,
      type: f.type,
      name: f.name,
      slug: f.slug,
      latitude: f.latitude,
      longitude: f.longitude,
      city: f.city,
      state: f.state,
      stateSlug: f.stateSlug,
      surface: f.surface,
      lit: f.lit,
      avgRating,
      reviewCount: ratings.length,
    }
  })

  return NextResponse.json(pins)
}
```

- [ ] **Step 2: Create FacilityLayer factory component**

Read `src/modules/map/components/layers/TrailsLayer.tsx` first to match the existing pattern.

```typescript
// src/modules/map/components/layers/FacilityLayer.tsx
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { FacilityPin } from '@/modules/parks/types'

interface FacilityLayerProps {
  map: mapboxgl.Map
  type: 'skateparks' | 'pumptracks' | 'bikeparks'
  color: string
  iconSvg: string  // inline SVG string for the pin icon
}

export function FacilityLayer({ map, type, color, iconSvg }: FacilityLayerProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const res = await fetch(`/api/facilities?type=${type}`)
      if (!res.ok || cancelled) return
      const pins: FacilityPin[] = await res.json()

      // Clean up previous markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      for (const pin of pins) {
        // Build marker element using DOM methods (no innerHTML)
        const el = document.createElement('div')
        el.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        `
        const iconContainer = document.createElement('div')
        iconContainer.style.cssText = 'width: 18px; height: 18px; color: white;'
        // iconSvg is static markup from renderToStaticMarkup — safe to set as SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(iconSvg, 'image/svg+xml')
        const svgEl = svgDoc.documentElement
        svgEl.setAttribute('width', '18')
        svgEl.setAttribute('height', '18')
        svgEl.setAttribute('stroke', 'white')
        iconContainer.appendChild(svgEl)
        el.appendChild(iconContainer)

        // Build popup using DOM methods
        const popupEl = document.createElement('div')
        popupEl.style.cssText = 'padding: 8px; min-width: 180px;'

        const nameEl = document.createElement('p')
        nameEl.style.cssText = 'font-weight: 600; margin: 0 0 4px;'
        nameEl.textContent = pin.name
        popupEl.appendChild(nameEl)

        const metaEl = document.createElement('p')
        metaEl.style.cssText = 'font-size: 12px; color: #666; margin: 0 0 4px;'
        const parts = [pin.city, pin.state, pin.surface, pin.lit ? 'Lit' : null].filter(Boolean)
        metaEl.textContent = parts.join(' · ')
        popupEl.appendChild(metaEl)

        if (pin.reviewCount > 0 && pin.avgRating != null) {
          const ratingEl = document.createElement('p')
          ratingEl.style.cssText = 'font-size: 12px; margin: 0 0 6px;'
          ratingEl.textContent = `★ ${pin.avgRating} (${pin.reviewCount} review${pin.reviewCount !== 1 ? 's' : ''})`
          popupEl.appendChild(ratingEl)
        }

        if (pin.stateSlug && pin.slug) {
          const link = document.createElement('a')
          link.href = `/parks/${pin.stateSlug}/${pin.slug}`
          link.style.cssText = 'font-size: 12px; color: var(--color-primary, #16a34a); text-decoration: none;'
          link.textContent = 'View Details →'
          popupEl.appendChild(link)
        }

        const popup = new mapboxgl.Popup({ offset: 20 }).setDOMContent(popupEl)

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pin.longitude, pin.latitude])
          .setPopup(popup)
          .addTo(map)

        markersRef.current.push(marker)
      }
    }

    load()

    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [map, type, color, iconSvg])

  return null
}
```

- [ ] **Step 3: Create three thin wrapper layer components**

These are minimal wrappers that inject the type-specific icon SVG:

```typescript
// src/modules/map/components/layers/SkateparksLayer.tsx
'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

// Lucide Zap icon as static SVG
const ZAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`

export function SkateparksLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="skateparks" color="#F97316" iconSvg={ZAP_SVG} />
}
```

```typescript
// src/modules/map/components/layers/PumpTracksLayer.tsx
'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

// Lucide Bike icon as static SVG
const BIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 0 0-1-1h-1"/><path d="M15 6l-3 9-3-3-3 3"/><path d="M9 9h5.5l.5 3"/></svg>`

export function PumpTracksLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="pumptracks" color="#14B8A6" iconSvg={BIKE_SVG} />
}
```

```typescript
// src/modules/map/components/layers/BikeParksLayer.tsx
'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

// Lucide Mountain icon as static SVG
const MOUNTAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`

export function BikeParksLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="bikeparks" color="#8B5CF6" iconSvg={MOUNTAIN_SVG} />
}
```

- [ ] **Step 4: Update LayerName type**

Read `src/modules/map/types/index.ts`, then add the three new layer names to the `LayerName` union:

```typescript
export type LayerName = 'trails' | 'events' | 'coaching' | 'skateparks' | 'pumptracks' | 'bikeparks'
```

- [ ] **Step 5: Update LayerToggle.tsx**

Read `src/modules/map/components/LayerToggle.tsx` and add entries to `LAYER_COLORS` and `LAYER_LABELS`:

```typescript
const LAYER_COLORS: Record<LayerName, string> = {
  trails: '#16a34a',
  events: '#ef4444',
  coaching: '#3b82f6',
  skateparks: '#F97316',
  pumptracks: '#14B8A6',
  bikeparks: '#8B5CF6',
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

- [ ] **Step 6: Update UnifiedMap.tsx**

Read `src/modules/map/components/UnifiedMap.tsx`. After the existing `CoachesLayer` block, add:

```typescript
// At the top, add imports:
import { SkateparksLayer } from './layers/SkateparksLayer'
import { PumpTracksLayer } from './layers/PumpTracksLayer'
import { BikeParksLayer } from './layers/BikeParksLayer'

// In JSX, after the CoachesLayer block:
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

- [ ] **Step 7: Update /trails/map page**

Read `src/app/trails/map/page.tsx` and update `availableLayers`:

```typescript
<UnifiedMapDynamic
  defaultLayers={['trails']}
  availableLayers={['trails', 'events', 'coaching', 'skateparks', 'pumptracks', 'bikeparks']}
  className="h-full"
/>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit
```

Expected: No errors on the new files or the modified LayerToggle/UnifiedMap.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/facilities/ src/modules/map/components/layers/ src/modules/map/types/ src/modules/map/components/LayerToggle.tsx src/modules/map/components/UnifiedMap.tsx src/app/trails/map/page.tsx
git commit -m "feat: facility API route and skateparks/pumptracks/bikeparks map layers"
```

---

## Task 6: Parks Directory Pages

**Files:**
- Create: `src/app/parks/page.tsx`
- Create: `src/app/parks/[state]/page.tsx`
- Create: `src/modules/parks/components/FacilityCard.tsx`

- [ ] **Step 1: Create FacilityCard component**

```typescript
// src/modules/parks/components/FacilityCard.tsx
import Link from 'next/link'
import type { FacilityPin } from '../types'

const TYPE_LABELS = {
  SKATEPARK: 'Skatepark',
  PUMPTRACK: 'Pump Track',
  BIKEPARK: 'Bike Park',
}

const TYPE_COLORS = {
  SKATEPARK: 'text-orange-500',
  PUMPTRACK: 'text-teal-500',
  BIKEPARK: 'text-purple-500',
}

interface FacilityCardProps {
  facility: FacilityPin
}

export function FacilityCard({ facility }: FacilityCardProps) {
  return (
    <Link
      href={`/parks/${facility.stateSlug}/${facility.slug}`}
      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-text)] truncate">{facility.name}</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {[facility.city, facility.state].filter(Boolean).join(', ')}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium ${TYPE_COLORS[facility.type]}`}>
          {TYPE_LABELS[facility.type]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        {facility.surface && <span>{facility.surface}</span>}
        {facility.lit && <span>Lit</span>}
        {facility.reviewCount > 0 && facility.avgRating != null && (
          <span>★ {facility.avgRating} ({facility.reviewCount})</span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create state grid page**

```typescript
// src/app/parks/page.tsx
import Link from 'next/link'
import { getStateStats } from '@/modules/parks/actions/facilities'

export const metadata = {
  title: 'Parks & Facilities | Ride MTB',
}

export default async function ParksPage() {
  const states = await getStateStats()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Skateparks, Pump Tracks & Bike Parks
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Browse {states.reduce((n, s) => n + s.count, 0).toLocaleString()} facilities across the US.
      </p>

      {states.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">
          No facilities synced yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {states.map((s) => (
            <Link
              key={s.stateSlug}
              href={`/parks/${s.stateSlug}`}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center hover:border-[var(--color-primary)] transition-colors"
            >
              <p className="font-semibold text-[var(--color-text)]">{s.stateName}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {s.count} {s.count === 1 ? 'facility' : 'facilities'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create state list page**

```typescript
// src/app/parks/[state]/page.tsx
import { notFound } from 'next/navigation'
import { getFacilitiesByState } from '@/modules/parks/actions/facilities'
import { FacilityCard } from '@/modules/parks/components/FacilityCard'
import type { FacilityType } from '@/modules/parks/types'

interface StatePageProps {
  params: Promise<{ state: string }>
  searchParams: Promise<{ type?: string }>
}

const FILTER_LABELS: Record<string, string> = {
  SKATEPARK: 'Skateparks',
  PUMPTRACK: 'Pump Tracks',
  BIKEPARK: 'Bike Parks',
}

export default async function StatePage({ params, searchParams }: StatePageProps) {
  const { state: stateSlug } = await params
  const { type: typeFilter } = await searchParams

  const validType = typeFilter && ['SKATEPARK', 'PUMPTRACK', 'BIKEPARK'].includes(typeFilter)
    ? (typeFilter as FacilityType)
    : undefined

  const facilities = await getFacilitiesByState(stateSlug, validType)

  if (facilities.length === 0 && !validType) {
    notFound()
  }

  const stateName = facilities[0]?.state ?? stateSlug

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-[var(--color-text-muted)]">
        <a href="/parks" className="hover:text-[var(--color-text)]">Parks</a>
        <span className="mx-2">/</span>
        <span>{stateName}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
        {stateName} — {validType ? FILTER_LABELS[validType] : 'All Facilities'}
      </h1>

      {/* Type filter tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <a
          href={`/parks/${stateSlug}`}
          className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${!validType ? 'bg-[var(--color-primary)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
        >
          All
        </a>
        {(['SKATEPARK', 'PUMPTRACK', 'BIKEPARK'] as FacilityType[]).map((t) => (
          <a
            key={t}
            href={`/parks/${stateSlug}?type=${t}`}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${validType === t ? 'bg-[var(--color-primary)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            {FILTER_LABELS[t]}
          </a>
        ))}
      </div>

      {facilities.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No facilities found for this filter.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {facilities.map((f) => (
            <FacilityCard key={f.id} facility={f} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/parks/ src/modules/parks/components/FacilityCard.tsx
git commit -m "feat: parks directory state grid and state list pages"
```

---

## Task 7: Facility Detail Page

**Files:**
- Create: `src/app/parks/[state]/[slug]/page.tsx`
- Create: `src/modules/parks/components/FacilityDetail.tsx`

- [ ] **Step 1: Create FacilityDetail component**

```typescript
// src/modules/parks/components/FacilityDetail.tsx
import type { FacilityWithStats } from '../types'

const TYPE_LABELS = {
  SKATEPARK: 'Skatepark',
  PUMPTRACK: 'Pump Track',
  BIKEPARK: 'Bike Park',
}

interface FacilityDetailProps {
  facility: FacilityWithStats
}

function DetailRow({ label, value }: { label: string; value: string | null | boolean }) {
  if (value === null || value === undefined) return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value
  return (
    <div className="flex gap-4 py-2 border-b border-[var(--color-border)]">
      <dt className="w-32 shrink-0 text-sm text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--color-text)]">{display}</dd>
    </div>
  )
}

export function FacilityDetail({ facility }: FacilityDetailProps) {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {TYPE_LABELS[facility.type]}
          </span>
          {facility.avgRating != null && (
            <span className="text-sm text-[var(--color-text-muted)]">
              ★ {facility.avgRating} ({facility.reviewCount} review{facility.reviewCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">{facility.name}</h1>
        {(facility.city || facility.state) && (
          <p className="mt-1 text-[var(--color-text-muted)]">
            {[facility.city, facility.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {facility.description && (
        <p className="mb-6 text-[var(--color-text)]">{facility.description}</p>
      )}

      <dl className="mb-8">
        <DetailRow label="Address" value={facility.address} />
        <DetailRow label="Surface" value={facility.surface} />
        <DetailRow label="Hours" value={facility.openingHours} />
        <DetailRow label="Operator" value={facility.operator} />
        <DetailRow label="Fee" value={facility.fee} />
        <DetailRow label="Lit" value={facility.lit} />
        {facility.website && (
          <div className="flex gap-4 py-2 border-b border-[var(--color-border)]">
            <dt className="w-32 shrink-0 text-sm text-[var(--color-text-muted)]">Website</dt>
            <dd className="text-sm">
              <a href={facility.website} target="_blank" rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline">
                {facility.website}
              </a>
            </dd>
          </div>
        )}
        {facility.phone && (
          <div className="flex gap-4 py-2 border-b border-[var(--color-border)]">
            <dt className="w-32 shrink-0 text-sm text-[var(--color-text-muted)]">Phone</dt>
            <dd className="text-sm">
              <a href={`tel:${facility.phone}`} className="text-[var(--color-primary)] hover:underline">
                {facility.phone}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
```

- [ ] **Step 2: Create detail page**

```typescript
// src/app/parks/[state]/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getFacilityBySlug } from '@/modules/parks/actions/facilities'
import { FacilityDetail } from '@/modules/parks/components/FacilityDetail'

interface DetailPageProps {
  params: Promise<{ state: string; slug: string }>
}

export async function generateMetadata({ params }: DetailPageProps) {
  const { slug } = await params
  const facility = await getFacilityBySlug(slug)
  if (!facility) return {}
  return {
    title: `${facility.name} | Ride MTB Parks`,
  }
}

export default async function FacilityDetailPage({ params }: DetailPageProps) {
  const { state: stateSlug, slug } = await params
  const facility = await getFacilityBySlug(slug)

  if (!facility || facility.stateSlug !== stateSlug) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-6 text-sm text-[var(--color-text-muted)]">
        <a href="/parks" className="hover:text-[var(--color-text)]">Parks</a>
        <span className="mx-2">/</span>
        <a href={`/parks/${stateSlug}`} className="hover:text-[var(--color-text)]">{facility.state}</a>
        <span className="mx-2">/</span>
        <span>{facility.name}</span>
      </nav>
      <FacilityDetail facility={facility} />
      {/* Reviews and photos sections added in Tasks 8 & 9 */}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/parks/[state]/[slug]/ src/modules/parks/components/FacilityDetail.tsx
git commit -m "feat: facility detail page"
```

---

## Task 8: Community Reviews

**Files:**
- Create: `src/modules/parks/lib/moderation.ts`
- Create: `src/modules/parks/actions/reviews.ts`
- Create: `src/modules/parks/components/ReviewForm.tsx`
- Create: `src/modules/parks/components/ReviewList.tsx`
- Modify: `src/app/parks/[state]/[slug]/page.tsx`

- [ ] **Step 1: Create moderation helpers**

```typescript
// src/modules/parks/lib/moderation.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function screenText(text: string): Promise<'APPROVED' | 'REJECTED'> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [
        {
          role: 'user',
          content: `Does this review contain slurs, hate speech, or obvious spam? Reply with only YES or NO.\n\nReview: "${text}"`,
        },
      ],
    })
    const verdict = res.content[0]?.type === 'text' ? res.content[0].text.trim().toUpperCase() : 'NO'
    return verdict.startsWith('YES') ? 'REJECTED' : 'APPROVED'
  } catch {
    // Claude unavailable — optimistic fallback for reviews
    return 'APPROVED'
  }
}

export async function screenImage(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<'APPROVED' | 'FLAGGED' | 'REJECTED'> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: 'Does this image contain nudity, pornography, graphic violence, or other content that violates community guidelines for a public sports facility website? Reply with only APPROVED, FLAGGED, or REJECTED.',
            },
          ],
        },
      ],
    })
    const verdict = res.content[0]?.type === 'text' ? res.content[0].text.trim().toUpperCase() : 'FLAGGED'
    if (verdict.startsWith('REJECTED')) return 'REJECTED'
    if (verdict.startsWith('FLAGGED')) return 'FLAGGED'
    return 'APPROVED'
  } catch {
    // Claude unavailable — conservative fallback for images
    return 'FLAGGED'
  }
}
```

- [ ] **Step 2: Create reviews action**

```typescript
// src/modules/parks/actions/reviews.ts
'use server'

import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { screenText } from '../lib/moderation'
import { revalidatePath } from 'next/cache'

export async function submitFacilityReview(
  facilityId: string,
  rating: number,
  body: string | null,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()

  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }

  // Screen text if provided
  if (body && body.trim().length > 0) {
    const verdict = await screenText(body.trim())
    if (verdict === 'REJECTED') {
      return { success: false, error: 'Review contains content that violates our community guidelines.' }
    }
  }

  const facility = await db.facility.findUnique({ where: { id: facilityId }, select: { stateSlug: true, slug: true } })
  if (!facility) return { success: false, error: 'Facility not found' }

  await db.facilityReview.upsert({
    where: { facilityId_userId: { facilityId, userId: user.id } },
    create: { facilityId, userId: user.id, rating, body: body?.trim() ?? null },
    update: { rating, body: body?.trim() ?? null },
  })

  revalidatePath(`/parks/${facility.stateSlug}/${facility.slug}`)
  return { success: true }
}

export async function getFacilityReviews(facilityId: string) {
  return db.facilityReview.findMany({
    where: { facilityId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, image: true } },
    },
  })
}
```

- [ ] **Step 3: Create ReviewForm component**

```typescript
// src/modules/parks/components/ReviewForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { submitFacilityReview } from '../actions/reviews'

interface ReviewFormProps {
  facilityId: string
}

export function ReviewForm({ facilityId }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitFacilityReview(facilityId, rating, body || null)
      if (result.success) {
        setSuccess(true)
        setRating(0)
        setBody('')
      } else {
        setError(result.error ?? 'Something went wrong')
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
        <p className="text-sm text-green-700">Review submitted. Thanks for your feedback!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Your Rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="text-2xl leading-none focus:outline-none"
            >
              {star <= (hoveredRating || rating) ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="review-body" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Review (optional)
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Share your experience..."
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Create ReviewList component**

```typescript
// src/modules/parks/components/ReviewList.tsx
import Image from 'next/image'

interface Review {
  id: string
  rating: number
  body: string | null
  createdAt: Date
  user: { name: string | null; image: string | null }
}

interface ReviewListProps {
  reviews: Review[]
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No reviews yet. Be the first to share your experience!
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg border border-[var(--color-border)] p-4">
          <div className="mb-2 flex items-center gap-3">
            {review.user.image && (
              <Image
                src={review.user.image}
                alt={review.user.name ?? 'User'}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {review.user.name ?? 'Anonymous'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {new Date(review.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-auto text-sm">
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            </div>
          </div>
          {review.body && (
            <p className="text-sm text-[var(--color-text)]">{review.body}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Wire reviews into detail page**

Update `src/app/parks/[state]/[slug]/page.tsx`:
- Import `ReviewForm`, `ReviewList`, `getFacilityReviews`
- Import `getServerSession` and auth config to check if user is logged in
- Add review section below `FacilityDetail`

```typescript
// Add to imports:
import { ReviewForm } from '@/modules/parks/components/ReviewForm'
import { ReviewList } from '@/modules/parks/components/ReviewList'
import { getFacilityReviews } from '@/modules/parks/actions/reviews'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

// Add after FacilityDetail:
const reviews = await getFacilityReviews(facility.id)
const session = await getServerSession(authOptions)

// In JSX, after FacilityDetail:
<section className="mt-10">
  <h2 className="mb-6 text-xl font-bold text-[var(--color-text)]">Reviews</h2>
  {session ? (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Write a Review</h3>
      <ReviewForm facilityId={facility.id} />
    </div>
  ) : (
    <p className="mb-6 text-sm text-[var(--color-text-muted)]">
      <a href="/auth/signin" className="text-[var(--color-primary)] hover:underline">Sign in</a> to write a review.
    </p>
  )}
  <ReviewList reviews={reviews} />
</section>
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/parks/lib/moderation.ts src/modules/parks/actions/reviews.ts src/modules/parks/components/ReviewForm.tsx src/modules/parks/components/ReviewList.tsx src/app/parks/[state]/[slug]/page.tsx
git commit -m "feat: facility reviews with Claude text moderation"
```

---

## Task 9: Community Photos

**Files:**
- Create: `src/modules/parks/lib/exif.ts`
- Create: `src/modules/parks/actions/photos.ts`
- Create: `src/modules/parks/components/PhotoGallery.tsx`
- Create: `src/modules/parks/components/PhotoUpload.tsx`
- Modify: `src/app/parks/[state]/[slug]/page.tsx`

- [ ] **Step 1: Install piexifjs**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npm install piexifjs
npm install --save-dev @types/piexifjs
```

- [ ] **Step 2: Create exif.ts**

```typescript
// src/modules/parks/lib/exif.ts
import piexif from 'piexifjs'

/**
 * Strip EXIF metadata from a JPEG buffer.
 * PNG and WebP do not embed EXIF — skip those formats.
 */
export function stripExifFromJpeg(buffer: Buffer): Buffer {
  // piexif operates on binary strings
  const binaryStr = buffer.toString('binary')
  const stripped = piexif.remove(binaryStr)
  return Buffer.from(stripped, 'binary')
}
```

- [ ] **Step 3: Create photos action**

```typescript
// src/modules/parks/actions/photos.ts
'use server'

import { requireAuth } from '@/lib/auth/guards'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { createClient } from '@supabase/supabase-js'
import { stripExifFromJpeg } from '../lib/exif'
import { screenImage } from '../lib/moderation'
import { revalidatePath } from 'next/cache'

const BUCKET = 'facility-photos'
const MAX_PHOTOS_PER_FACILITY = 5
const MAX_PHOTOS_PER_DAY = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

function detectMimeType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png'
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp'
  return null
}

export async function uploadFacilityPhoto(
  facilityId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const file = formData.get('photo')

  if (!(file instanceof File)) {
    return { success: false, error: 'No file provided' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File too large (max 10MB)' }
  }

  const arrayBuffer = await file.arrayBuffer()
  let buffer = Buffer.from(arrayBuffer)

  const mimeType = detectMimeType(buffer)
  if (!mimeType) {
    return { success: false, error: 'Unsupported file type. Use JPEG, PNG, or WebP.' }
  }

  // Check rate limits
  const [facilityCount, dailyCount] = await Promise.all([
    db.facilityPhoto.count({
      where: { facilityId, userId: user.id, status: { not: 'REJECTED' } },
    }),
    db.facilityPhoto.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  if (facilityCount >= MAX_PHOTOS_PER_FACILITY) {
    return { success: false, error: 'You have reached the maximum photos for this facility (5).' }
  }
  if (dailyCount >= MAX_PHOTOS_PER_DAY) {
    return { success: false, error: 'You have reached your daily upload limit (20 photos).' }
  }

  // Strip EXIF from JPEG
  if (mimeType === 'image/jpeg') {
    buffer = stripExifFromJpeg(buffer)
  }

  // Upload to Supabase Storage
  const supabase = getAdminSupabase()
  const caption = typeof formData.get('caption') === 'string' ? formData.get('caption') as string : null
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp'
  const storageKey = `${facilityId}/${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    return { success: false, error: 'Upload failed. Please try again.' }
  }

  // Screen with Claude Vision
  const base64 = buffer.toString('base64')
  const aiVerdict = await screenImage(base64, mimeType)

  if (aiVerdict === 'REJECTED') {
    // Delete the uploaded file and don't create a DB record
    await supabase.storage.from(BUCKET).remove([storageKey])
    return { success: false, error: 'Photo was rejected for violating community guidelines.' }
  }

  await db.facilityPhoto.create({
    data: {
      facilityId,
      userId: user.id,
      storageKey,
      caption: caption || null,
      status: 'PENDING',
      aiVerdict,
    },
  })

  const facility = await db.facility.findUnique({
    where: { id: facilityId },
    select: { stateSlug: true, slug: true },
  })
  if (facility) revalidatePath(`/parks/${facility.stateSlug}/${facility.slug}`)

  return { success: true }
}

export async function getFacilityPhotos(facilityId: string) {
  const supabase = getAdminSupabase()
  const photos = await db.facilityPhoto.findMany({
    where: { facilityId, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } },
  })
  return photos.map((p) => ({
    ...p,
    url: supabase.storage.from(BUCKET).getPublicUrl(p.storageKey).data.publicUrl,
  }))
}

export async function approveFacilityPhoto(photoId: string) {
  await requireAdmin()
  const photo = await db.facilityPhoto.update({
    where: { id: photoId },
    data: { status: 'APPROVED' },
    include: { facility: { select: { stateSlug: true, slug: true } } },
  })
  revalidatePath(`/parks/${photo.facility.stateSlug}/${photo.facility.slug}`)
}

export async function rejectFacilityPhoto(photoId: string) {
  await requireAdmin()
  const photo = await db.facilityPhoto.findUnique({
    where: { id: photoId },
    include: { facility: { select: { stateSlug: true, slug: true } } },
  })
  if (!photo) return

  const supabase = getAdminSupabase()
  await supabase.storage.from(BUCKET).remove([photo.storageKey])
  await db.facilityPhoto.delete({ where: { id: photoId } })
  revalidatePath(`/parks/${photo.facility.stateSlug}/${photo.facility.slug}`)
}

export async function deleteFacilityPhoto(photoId: string) {
  const user = await requireAuth()
  const photo = await db.facilityPhoto.findUnique({
    where: { id: photoId },
    include: { facility: { select: { stateSlug: true, slug: true } } },
  })
  if (!photo) return
  if (photo.userId !== user.id) throw new Error('Not authorized')

  const supabase = getAdminSupabase()
  await supabase.storage.from(BUCKET).remove([photo.storageKey])
  await db.facilityPhoto.delete({ where: { id: photoId } })
  revalidatePath(`/parks/${photo.facility.stateSlug}/${photo.facility.slug}`)
}
```

- [ ] **Step 4: Create PhotoGallery component**

```typescript
// src/modules/parks/components/PhotoGallery.tsx
interface Photo {
  id: string
  url: string
  caption: string | null
  user: { name: string | null }
}

interface PhotoGalleryProps {
  photos: Photo[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (photos.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Photos</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption ?? 'Facility photo'}
              className="h-full w-full object-cover"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create PhotoUpload component**

```typescript
// src/modules/parks/components/PhotoUpload.tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadFacilityPhoto } from '../actions/photos'

interface PhotoUploadProps {
  facilityId: string
}

export function PhotoUpload({ facilityId }: PhotoUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await uploadFacilityPhoto(facilityId, formData)
      if (result.success) {
        setSuccess(true)
        formRef.current?.reset()
        setTimeout(() => setSuccess(false), 4000)
      } else {
        setError(result.error ?? 'Upload failed')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="photo-file" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Add a Photo
        </label>
        <input
          id="photo-file"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded file:border-0 file:bg-[var(--color-surface)] file:px-3 file:py-1 file:text-sm"
        />
      </div>
      <div>
        <label htmlFor="photo-caption" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Caption (optional)
        </label>
        <input
          id="photo-caption"
          name="caption"
          type="text"
          maxLength={120}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Describe the photo..."
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">Photo submitted for review!</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'Uploading...' : 'Upload Photo'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Wire photos into detail page**

Update `src/app/parks/[state]/[slug]/page.tsx` to import and render `PhotoGallery` and `PhotoUpload`:

```typescript
// Add imports:
import { PhotoGallery } from '@/modules/parks/components/PhotoGallery'
import { PhotoUpload } from '@/modules/parks/components/PhotoUpload'
import { getFacilityPhotos } from '@/modules/parks/actions/photos'

// Add data fetch:
const photos = await getFacilityPhotos(facility.id)

// Add photos section in JSX (before or after reviews):
<section className="mt-8">
  <PhotoGallery photos={photos} />
  {session && (
    <div className="mt-4">
      <PhotoUpload facilityId={facility.id} />
    </div>
  )}
</section>
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/parks/lib/exif.ts src/modules/parks/actions/photos.ts src/modules/parks/components/PhotoGallery.tsx src/modules/parks/components/PhotoUpload.tsx src/app/parks/[state]/[slug]/page.tsx
git commit -m "feat: facility photo upload with Claude Vision moderation and EXIF stripping"
```

---

## Task 10: Admin Panels

**Files:**
- Create: `src/app/admin/parks/page.tsx`
- Create: `src/app/admin/parks/photos/page.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Read admin layout to understand nav pattern**

Read `src/app/admin/layout.tsx` and `src/app/admin/page.tsx` to understand how the admin nav is structured.

- [ ] **Step 2: Create admin sync panel**

```typescript
// src/app/admin/parks/page.tsx
'use client'

import { useTransition, useState, useEffect } from 'react'
import Link from 'next/link'
import { syncFacilitiesFromOSM, getSyncState } from '@/modules/parks/actions/sync'
import { Loader2 } from 'lucide-react'

export default function AdminParksPage() {
  const [syncState, setSyncState] = useState<{
    syncInProgress: boolean
    lastSyncedAt: Date | null
    lastSyncResult: Record<string, unknown> | null
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ added: number; updated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSyncState().then(setSyncState)
  }, [])

  const handleSync = () => {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await syncFacilitiesFromOSM()
        setResult(res)
        const updated = await getSyncState()
        setSyncState(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed')
        const updated = await getSyncState()
        setSyncState(updated)
      }
    })
  }

  const isRunning = isPending || syncState?.syncInProgress

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Parks & Facilities</h1>

      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">OSM Sync</h2>

        {syncState?.lastSyncedAt && (
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Last synced: {new Date(syncState.lastSyncedAt).toLocaleString()}
          </p>
        )}

        <button
          onClick={handleSync}
          disabled={!!isRunning}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
          {isRunning ? 'Syncing...' : 'Sync from OSM'}
        </button>

        {result && (
          <p className="mt-3 text-sm text-green-600">
            Sync complete — {result.added} added, {result.updated} updated.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Photo Moderation</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Review and approve user-submitted photos.
        </p>
        <Link
          href="/admin/parks/photos"
          className="inline-block rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        >
          View Photo Queue →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create photo moderation queue**

```typescript
// src/app/admin/parks/photos/page.tsx
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { createClient } from '@supabase/supabase-js'
import { approveFacilityPhoto, rejectFacilityPhoto } from '@/modules/parks/actions/photos'

export const metadata = { title: 'Photo Queue | Admin' }

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function AdminParksPhotosPage() {
  await requireAdmin()

  const photos = await db.facilityPhoto.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      facility: { select: { name: true, stateSlug: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  })

  const supabase = getAdminSupabase()

  const photosWithUrls = photos.map((p) => ({
    ...p,
    url: supabase.storage.from('facility-photos').getPublicUrl(p.storageKey).data.publicUrl,
  }))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Photo Moderation Queue</h1>

      {photosWithUrls.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No photos pending review.</p>
      ) : (
        <div className="space-y-4">
          {photosWithUrls.map((photo) => (
            <div key={photo.id} className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Pending photo"
                className="h-24 w-24 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-text)]">{photo.facility.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  By {photo.user.name ?? photo.user.email} · {new Date(photo.createdAt).toLocaleDateString()}
                </p>
                {photo.caption && (
                  <p className="mt-1 text-sm text-[var(--color-text-muted)] italic">"{photo.caption}"</p>
                )}
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  photo.aiVerdict === 'APPROVED' ? 'bg-green-500/10 text-green-700' :
                  photo.aiVerdict === 'FLAGGED' ? 'bg-yellow-500/10 text-yellow-700' :
                  'bg-gray-500/10 text-gray-600'
                }`}>
                  AI: {photo.aiVerdict ?? 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <form action={approveFacilityPhoto.bind(null, photo.id)}>
                  <button
                    type="submit"
                    className="rounded px-3 py-1.5 text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectFacilityPhoto.bind(null, photo.id)}>
                  <button
                    type="submit"
                    className="rounded px-3 py-1.5 text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add Parks link to admin nav**

Read `src/app/admin/layout.tsx`, then add:
```typescript
<a href="/admin/parks">Parks</a>
```
in the same style as existing nav links.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/parks/ src/app/admin/layout.tsx
git commit -m "feat: admin parks sync panel and photo moderation queue"
```

---

## Task 11: Final Wiring & Smoke Test

**Files:**
- Verify: `src/app/parks/` all routes load
- Verify: `/trails/map` with new layer toggles
- Verify: `/admin/parks` sync flow

- [ ] **Step 1: TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 3: Verify Supabase Storage bucket exists**

The `facility-photos` bucket must exist and be public. Check in Supabase Dashboard > Storage.
If it doesn't exist, create it:
- Name: `facility-photos`
- Public bucket: Yes

- [ ] **Step 4: Manual smoke tests (dev server)**

Start dev server: `npm run dev`

- Visit `/parks` — should show state grid (or "No facilities synced" message if empty)
- Visit `/trails/map` — open layer toggle, verify Skateparks/Pump Tracks/Bike Parks toggles appear
- Visit `/admin/parks` — should show sync panel without crashing
- Visit `/admin/parks/photos` — should show empty queue

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: parks facility tracker — skateparks, pump tracks, bike parks with OSM sync, map layers, directory, reviews, and photos"
```
