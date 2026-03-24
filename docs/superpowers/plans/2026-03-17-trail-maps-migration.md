# Trail Maps Migration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the standalone trail maps project (`ride-mtb-trail-maps`) into the monolith (`ride-mtb`), replacing the existing stub with the full-featured implementation including 2,284+ trails, enhanced map components, and complete trail/system pages.

**Architecture:** Schema-first approach — extend existing Prisma models with missing fields and add new models, then migrate all trail data from the standalone's local Docker DB to Supabase, then port components and pages into `src/modules/trails/`. Standalone's advanced features (offline maps, GPS discovery, leaderboard) are deferred; core browse/explore/detail/reviews/conditions/favorites are in scope.

**Tech Stack:** Next.js 15.5.12 (App Router), Prisma v7 + PrismaPg adapter, Supabase PostgreSQL, Mapbox GL v3, Tailwind CSS v4, NextAuth v5, TypeScript, `npx tsx` scripts.

---

## Source / Target Reference

| | Path | DB |
|---|---|---|
| **Standalone (source)** | `/Users/kylewarner/Documents/ride-mtb-trail-maps` | `postgresql://postgres:postgres@localhost:5444/ride_mtb_trail_maps` |
| **Monolith (target)** | `/Users/kylewarner/Documents/ride-mtb` | `DATABASE_DIRECT_URL` in `.env.local` |

---

## File Map

### Files to Modify
- `prisma/schema.prisma` — Add fields to TrailSystem, Trail, TrailGpsTrack, TrailReview, PointOfInterest, TrailRegion; rename `simplifiedTrack`→`trackData`; add TrailPhoto, TrailSystemPhoto, TrailReviewHelpful models
- `src/modules/trails/lib/queries.ts` — Expand to include `boundsJson`, `elevationProfile`, review `body`/`helpfulCount`, system `trailheadLat/Lng`, POI `isApproved`
- `src/modules/trails/types/index.ts` — Add fields matching new schema
- `src/modules/trails/components/TrailMap.tsx` — Add multi-style support, 3D terrain, GeolocateControl
- `src/app/trails/explore/page.tsx` — Replace grid with cluster map + filter sidebar
- `src/app/trails/explore/[systemSlug]/page.tsx` — Add weather, difficulty distribution, photos, trailhead info
- `src/app/trails/explore/[systemSlug]/[trailSlug]/page.tsx` — Add photos, POIs, helpful votes, directions

### Files to Create
- `scripts/migrate-trail-maps.ts` — Data migration script (standalone → monolith)
- `src/modules/trails/components/SystemClusterMap.tsx` — Mapbox cluster map for explore
- `src/modules/trails/components/TrailLines.tsx` — Reusable trail polyline renderer
- `src/modules/trails/components/MapStyleSelector.tsx` — Style switcher (standard/satellite/terrain/3D)
- `src/modules/trails/components/TrailCard.tsx` — Compact trail summary card
- `src/modules/trails/components/DifficultyDistribution.tsx` — Bar chart of trails by difficulty
- `src/modules/trails/components/RadarChart.tsx` — 5-axis SVG comparison chart
- `src/modules/trails/components/TrailheadMarker.tsx` — Trailhead pin on map
- `src/modules/trails/components/TrailMapPopup.tsx` — Mapbox popup component
- `src/modules/trails/components/PhotoGallery.tsx` — Trail photo carousel
- `src/modules/trails/components/GetDirectionsButton.tsx` — Google/Apple Maps deep link
- `src/modules/trails/components/ShareButton.tsx` — Copy link / share
- `src/modules/trails/components/HelpfulButton.tsx` — Review helpfulness voting
- `src/modules/trails/components/TrailViewTracker.tsx` — LocalStorage view history
- `src/modules/trails/actions/toggleReviewHelpful.ts` — Server action
- `src/modules/trails/actions/logRideStandalone.ts` — Ride log form action

---

## Task 1: Schema Enhancement

**Files:**
- Modify: `prisma/schema.prisma`

### What to add/change:

**`TrailRegion`** — add bounds + counts:
```prisma
coverImageUrl     String?
boundsNeLat       Float?
boundsNeLng       Float?
boundsSwLat       Float?
boundsSwLng       Float?
trailSystemCount  Int     @default(0)
totalTrailCount   Int     @default(0)
```

**`TrailSystem`** — add trailhead info, flags, stats, photos:
```prisma
coverImageUrl     String?
phone             String?
trailheadLat      Float?
trailheadLng      Float?
trailheadNotes    String?
parkingInfo       String?
seasonalNotes     String?
passRequired      Boolean   @default(false)
dogFriendly       Boolean   @default(true)
eMtbAllowed       Boolean   @default(true)
isFeatured        Boolean   @default(false)
totalVertFt       Float     @default(0)
averageRating     Float?
reviewCount       Int       @default(0)
rideCount         Int       @default(0)
importSource      String?
externalId        String?
submittedByUserId String?
photos            TrailSystemPhoto[]
```

**`Trail`** — add stats, features, submission fields:
```prisma
difficultyLabel       String?
hasGpsTrack           Boolean   @default(false)
features              String[]
surfaceType           String?
direction             String?
averageRating         Float?
avgFlowRating         Float?
avgSceneryRating      Float?
avgTechnicalRating    Float?
avgMaintenanceRating  Float?
reviewCount           Int       @default(0)
rideCount             Int       @default(0)
lastRiddenAt          DateTime?
avgRideSpeedMph       Float?
avgRideDurationMin    Float?
gpsContributionCount  Int       @default(0)
importSource          String?
externalId            String?
submittedByUserId     String?
photos                TrailPhoto[]
```

**`TrailGpsTrack`** — rename `simplifiedTrack`→`trackData`, add elevation profile:
```prisma
// rename: simplifiedTrack → trackData
trackData         String?   @db.Text
elevationProfile  String?   @db.Text
contributorCount  Int       @default(1)
boundsJson        String?   @db.Text   // stored as serialized JSON string, matches standalone
```
Remove `simplifiedTrack` field.

**`TrailReview`** — add title, body, helpful fields:
```prisma
title           String?
body            String?   @db.Text
helpfulCount    Int       @default(0)
isHidden        Boolean   @default(false)
reportCount     Int       @default(0)
helpfulVotes    TrailReviewHelpful[]
```

**`PointOfInterest`** — add approval, photos, video:
```prisma
photoUrl          String?
videoUrl          String?
isApproved        Boolean   @default(true)
submittedByUserId String?
```

**New model `TrailPhoto`:**
```prisma
model TrailPhoto {
  id          String   @id @default(cuid())
  trailId     String
  url         String
  filename    String?
  caption     String?
  sortOrder   Int      @default(0)
  isCover     Boolean  @default(false)
  latitude    Float?
  longitude   Float?
  uploadedBy  String?
  createdAt   DateTime @default(now())
  trail       Trail    @relation(fields: [trailId], references: [id], onDelete: Cascade)

  @@index([trailId, sortOrder])
  @@map("trail_photos")
}
```

**New model `TrailSystemPhoto`:**
```prisma
model TrailSystemPhoto {
  id            String      @id @default(cuid())
  trailSystemId String
  url           String
  filename      String?
  caption       String?
  sortOrder     Int         @default(0)
  isCover       Boolean     @default(false)
  uploadedBy    String?
  createdAt     DateTime    @default(now())
  trailSystem   TrailSystem @relation(fields: [trailSystemId], references: [id], onDelete: Cascade)

  @@index([trailSystemId, sortOrder])
  @@map("trail_system_photos")
}
```

**New model `TrailReviewHelpful`:**
```prisma
model TrailReviewHelpful {
  id       String      @id @default(cuid())
  reviewId String
  userId   String
  review   TrailReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  user     User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([reviewId, userId])
  @@map("trail_review_helpful")
}
```

Also add `trailReviewHelpful TrailReviewHelpful[]` to the `User` model.

### Steps:

- [ ] **Step 1: Create a new branch**
```bash
cd /Users/kylewarner/Documents/ride-mtb
git checkout -b feature/trail-maps-migration
```

- [ ] **Step 2: Apply all schema changes listed above to `prisma/schema.prisma`**

Key rename: find `simplifiedTrack  String?  @db.Text` and replace with `trackData  String?  @db.Text`.

- [ ] **Step 3: Generate and apply migration**
```bash
npx prisma migrate dev --name trail-maps-enhancement
```
Expected: migration file created, DB updated. If rename fails, Prisma may ask to confirm the column rename — confirm yes.

- [ ] **Step 4: Regenerate Prisma client**
```bash
npx prisma generate
```

- [ ] **Step 5: Fix all TypeScript errors from the rename**

Search for `simplifiedTrack` across `src/`:
```bash
grep -r "simplifiedTrack" src/ --include="*.ts" --include="*.tsx" -l
```

Expected 5 files with occurrences — update all to `trackData`:
- `src/modules/trails/lib/queries.ts` — query select fields
- `src/modules/trails/types/index.ts` — interface field `simplifiedTrack: string | null`
- `src/app/trails/explore/[systemSlug]/page.tsx` — two usages (mapping to TrailMap prop)
- `src/app/trails/explore/[systemSlug]/[trailSlug]/page.tsx` — three usages (GPS track access + map center calc)

> **Note:** The `User` model will have both `trailReviewHelpful TrailReviewHelpful[]` (new) and `reviewHelpfulVotes ReviewHelpful[]` (existing shop reviews). These are different models and different relation fields — Prisma will handle them correctly as separate tables. No conflict.

- [ ] **Step 6: Verify build still compiles**
```bash
npx tsc --noEmit
```
Expected: no errors (or only pre-existing ones).

- [ ] **Step 7: Commit**
```bash
git add prisma/schema.prisma prisma/migrations/ src/
git commit -m "feat(trails): enhance schema — add TrailPhoto, TrailSystemPhoto, TrailReviewHelpful, new fields"
```

---

## Task 2: Data Migration Script

**Files:**
- Create: `scripts/migrate-trail-maps.ts`

This script connects to the standalone Docker DB (source) and the monolith Supabase DB (target), and migrates: TrailRegions → TrailRegion, TrailSystems, Trails, TrailGpsTracks, TrailReviews, ConditionReports, RideLogs, PointsOfInterest, TrailPhotos, TrailSystemPhotos.

**Prerequisites:** Standalone Docker DB must be running on port 5444.

- [ ] **Step 1: Create the migration script**

```typescript
#!/usr/bin/env npx tsx
// scripts/migrate-trail-maps.ts
//
// Migrates trail data from standalone Docker DB → monolith Supabase
// Source: postgresql://postgres:postgres@localhost:5444/ride_mtb_trail_maps
// Target: DATABASE_DIRECT_URL in .env.local
//
// Usage: npx tsx scripts/migrate-trail-maps.ts

import { config } from 'dotenv'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

config({ path: '.env.local' })

// ── Source (standalone Docker) ───────────────────────────────

const srcPool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5444/ride_mtb_trail_maps',
  max: 3,
})

// ── Target (monolith Supabase) ───────────────────────────────

const tgtPool = new Pool({
  connectionString: process.env.DATABASE_DIRECT_URL,
  max: 3,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(tgtPool)
const db = new PrismaClient({ adapter })

// ── Helpers ──────────────────────────────────────────────────

function float(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function log(msg: string) { process.stdout.write(msg + '\n') }

// ── Main ─────────────────────────────────────────────────────

async function main() {
  log('Starting trail maps migration...\n')

  // 1. Regions
  log('Migrating regions...')
  const { rows: regions } = await srcPool.query('SELECT * FROM regions ORDER BY created_at')
  let regionMap: Record<string, string> = {} // srcId → tgtId
  for (const r of regions) {
    const existing = await db.trailRegion.findFirst({ where: { slug: r.slug } })
    const data = {
      name: r.name,
      slug: r.slug,
      description: r.description ?? undefined,
      state: r.state ?? undefined,
      country: r.country ?? 'US',
      boundsNeLat: float(r.bounds_ne_lat) ?? undefined,
      boundsNeLng: float(r.bounds_ne_lng) ?? undefined,
      boundsSwLat: float(r.bounds_sw_lat) ?? undefined,
      boundsSwLng: float(r.bounds_sw_lng) ?? undefined,
      trailSystemCount: r.trail_system_count ?? 0,
      totalTrailCount: r.total_trail_count ?? 0,
    }
    const tgt = existing
      ? await db.trailRegion.update({ where: { id: existing.id }, data })
      : await db.trailRegion.create({ data })
    regionMap[r.id] = tgt.id
  }
  log(`  ✓ ${regions.length} regions`)

  // 2. Trail Systems
  log('Migrating trail systems...')
  const { rows: systems } = await srcPool.query(
    'SELECT * FROM trail_systems ORDER BY created_at'
  )
  let systemMap: Record<string, string> = {}
  for (const s of systems) {
    const existing = await db.trailSystem.findFirst({ where: { slug: s.slug } })
    const data = {
      name: s.name,
      slug: s.slug,
      description: s.description ?? undefined,
      coverImageUrl: s.cover_image_url ?? undefined,
      city: s.city ?? undefined,
      state: s.state ?? undefined,
      country: s.country ?? 'US',
      latitude: float(s.latitude) ?? undefined,
      longitude: float(s.longitude) ?? undefined,
      trailheadLat: float(s.trailhead_lat) ?? undefined,
      trailheadLng: float(s.trailhead_lng) ?? undefined,
      trailheadNotes: s.trailhead_notes ?? undefined,
      parkingInfo: s.parking_info ?? undefined,
      seasonalNotes: s.seasonal_notes ?? undefined,
      websiteUrl: s.website_url ?? undefined,
      phone: s.phone ?? undefined,
      systemType: s.system_type ?? 'trail_network',
      status: s.status ?? 'open',
      // passRequired in standalone is String? ("yes", "Sno-Park Permit required", etc.) — coerce to Boolean
      passRequired: !!s.pass_required,
      dogFriendly: s.dog_friendly ?? true,
      eMtbAllowed: s.emtb_allowed ?? true,
      isFeatured: s.is_featured ?? false,
      totalMiles: float(s.total_miles) ?? 0,
      totalVertFt: float(s.total_vert_ft) ?? 0,
      trailCount: s.trail_count ?? 0,
      averageRating: float(s.average_rating) ?? undefined,
      reviewCount: s.review_count ?? 0,
      rideCount: s.ride_count ?? 0,
      importSource: s.import_source ?? undefined,
      externalId: s.external_id ?? undefined,
      regionId: s.region_id ? regionMap[s.region_id] : undefined,
    }
    const tgt = existing
      ? await db.trailSystem.update({ where: { id: existing.id }, data })
      : await db.trailSystem.create({ data })
    systemMap[s.id] = tgt.id
  }
  log(`  ✓ ${systems.length} trail systems`)

  // 3. Trails
  log('Migrating trails...')
  const { rows: trails } = await srcPool.query(
    'SELECT * FROM trails ORDER BY created_at'
  )
  let trailMap: Record<string, string> = {}
  let trailCount = 0
  for (const t of trails) {
    const systemId = systemMap[t.trail_system_id]
    if (!systemId) continue
    const existing = await db.trail.findFirst({ where: { slug: t.slug } })
    const data = {
      name: t.name,
      slug: t.slug,
      description: t.description ?? undefined,
      trailSystemId: systemId,
      trailType: t.trail_type ?? 'xc',
      physicalDifficulty: t.physical_difficulty ?? 1,
      technicalDifficulty: t.technical_difficulty ?? 1,
      difficultyLabel: t.difficulty_label ?? undefined,
      distance: float(t.distance_miles) ?? undefined,
      elevationGain: float(t.elevation_gain_ft) ?? undefined,
      elevationLoss: float(t.elevation_loss_ft) ?? undefined,
      highPoint: float(t.high_point_ft) ?? undefined,
      lowPoint: float(t.low_point_ft) ?? undefined,
      hasGpsTrack: t.has_gps_track ?? false,
      features: t.features ?? [],
      surfaceType: t.surface_type ?? undefined,
      direction: t.direction ?? undefined,
      status: t.status ?? 'open',
      currentCondition: t.current_condition ?? undefined,
      averageRating: float(t.average_rating) ?? undefined,
      reviewCount: t.review_count ?? 0,
      rideCount: t.ride_count ?? 0,
      importSource: t.import_source ?? undefined,
      externalId: t.external_id ?? undefined,
    }
    const tgt = existing
      ? await db.trail.update({ where: { id: existing.id }, data })
      : await db.trail.create({ data })
    trailMap[t.id] = tgt.id
    trailCount++
    if (trailCount % 200 === 0) process.stdout.write(`  ... ${trailCount}/${trails.length}\n`)
  }
  log(`  ✓ ${trailCount} trails`)

  // 4. GPS Tracks
  log('Migrating GPS tracks...')
  const { rows: tracks } = await srcPool.query(
    'SELECT * FROM trail_gps_tracks ORDER BY created_at'
  )
  let trackCount = 0
  for (const t of tracks) {
    const trailId = trailMap[t.trail_id]
    if (!trailId) continue
    const existing = await db.trailGpsTrack.findFirst({ where: { trailId } })
    const data = {
      trailId,
      trackData: t.track_data ?? undefined,
      elevationProfile: t.elevation_profile ?? undefined,
      boundsNeLat: float(t.bounds_ne_lat) ?? undefined,
      boundsNeLng: float(t.bounds_ne_lng) ?? undefined,
      boundsSwLat: float(t.bounds_sw_lat) ?? undefined,
      boundsSwLng: float(t.bounds_sw_lng) ?? undefined,
      contributorCount: t.contributor_count ?? 1,
      pointCount: 0,
    }
    if (existing) {
      await db.trailGpsTrack.update({ where: { id: existing.id }, data })
    } else {
      await db.trailGpsTrack.create({ data })
    }
    // Mark trail as hasGpsTrack
    await db.trail.update({ where: { id: trailId }, data: { hasGpsTrack: true } })
    trackCount++
  }
  log(`  ✓ ${trackCount} GPS tracks`)

  // 5. Trail System Photos
  log('Migrating system photos...')
  const { rows: sysPhotos } = await srcPool.query('SELECT * FROM trail_system_photos')
  let sysPhotoCount = 0
  for (const p of sysPhotos) {
    const trailSystemId = systemMap[p.trail_system_id]
    if (!trailSystemId) continue
    const existing = await db.trailSystemPhoto.findFirst({ where: { trailSystemId, url: p.url } })
    if (!existing) {
      await db.trailSystemPhoto.create({
        data: {
          trailSystemId,
          url: p.url,
          filename: p.filename ?? undefined,
          caption: p.caption ?? undefined,
          sortOrder: p.sort_order ?? 0,
          isCover: p.is_cover ?? false,
        },
      })
      sysPhotoCount++
    }
  }
  log(`  ✓ ${sysPhotoCount} system photos`)

  // 6. Trail Photos
  log('Migrating trail photos...')
  const { rows: trailPhotos } = await srcPool.query('SELECT * FROM trail_photos')
  let trailPhotoCount = 0
  for (const p of trailPhotos) {
    const trailId = trailMap[p.trail_id]
    if (!trailId) continue
    const existing = await db.trailPhoto.findFirst({ where: { trailId, url: p.url } })
    if (!existing) {
      await db.trailPhoto.create({
        data: {
          trailId,
          url: p.url,
          filename: p.filename ?? undefined,
          caption: p.caption ?? undefined,
          sortOrder: p.sort_order ?? 0,
          isCover: p.is_cover ?? false,
          latitude: float(p.latitude) ?? undefined,
          longitude: float(p.longitude) ?? undefined,
        },
      })
      trailPhotoCount++
    }
  }
  log(`  ✓ ${trailPhotoCount} trail photos`)

  // 7. Points of Interest
  log('Migrating points of interest...')
  const { rows: pois } = await srcPool.query('SELECT * FROM points_of_interest WHERE is_approved = true')
  let poiCount = 0
  for (const p of pois) {
    const trailId = trailMap[p.trail_id]
    if (!trailId) continue
    const existing = await db.pointOfInterest.findFirst({
      where: { trailId, lat: float(p.latitude)!, lng: float(p.longitude)! },
    })
    if (!existing) {
      await db.pointOfInterest.create({
        data: {
          trailId,
          type: p.poi_type ?? 'feature',
          name: p.name,
          description: p.description ?? undefined,
          lat: float(p.latitude)!,
          lng: float(p.longitude)!,
          distanceAlongMi: float(p.distance_along_mi) ?? undefined,
          photoUrl: p.photo_url ?? undefined,
          isApproved: true,
        },
      })
      poiCount++
    }
  }
  log(`  ✓ ${poiCount} points of interest`)

  log('\n─────────────────────────────────')
  log(`Migration complete:`)
  log(`  ${regions.length} regions`)
  log(`  ${systems.length} trail systems`)
  log(`  ${trailCount} trails`)
  log(`  ${trackCount} GPS tracks`)
  log(`  ${sysPhotoCount} system photos`)
  log(`  ${trailPhotoCount} trail photos`)
  log(`  ${poiCount} points of interest`)
  log('─────────────────────────────────')

  await db.$disconnect()
  await tgtPool.end()
  await srcPool.end()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Start the standalone Docker DB if not running**
```bash
docker ps | grep 5444
# If not running:
docker start <standalone-db-container-name>
# Or check with:
docker ps -a | grep trail
```

- [ ] **Step 3: Run the migration**
```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsx scripts/migrate-trail-maps.ts 2>&1
```
Expected: ~2,284 trails, ~38 systems migrated.

- [ ] **Step 4: Verify counts in Supabase**
```bash
node -e "
const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })
const p = new Pool({ connectionString: process.env.DATABASE_DIRECT_URL, ssl: { rejectUnauthorized: false }, max: 1 })
Promise.all([
  p.query('SELECT COUNT(*) FROM trail_systems'),
  p.query('SELECT COUNT(*) FROM trails'),
  p.query('SELECT COUNT(*) FROM trail_gps_tracks'),
]).then(([s, t, g]) => {
  console.log('Systems:', s.rows[0].count)
  console.log('Trails:', t.rows[0].count)
  console.log('GPS tracks:', g.rows[0].count)
  p.end()
})
"
```

- [ ] **Step 5: Commit**
```bash
git add scripts/migrate-trail-maps.ts
git commit -m "feat(trails): add data migration script from standalone → monolith"
```

---

## Task 3: Port Map Components

**Files:**
- Create: `src/modules/trails/components/MapStyleSelector.tsx`
- Create: `src/modules/trails/components/TrailLines.tsx`
- Create: `src/modules/trails/components/SystemClusterMap.tsx`
- Modify: `src/modules/trails/components/TrailMap.tsx`

Copy these directly from standalone (`src/components/map/`) and adapt to:
- Use monolith's import paths (`@/lib/db/client` instead of `@/lib/db`)
- Use CSS variable classes (`text-[var(--color-text)]`) instead of standalone's Tailwind classes
- Fix the coordinate order bug in `SystemClusterMap.onMoveEnd` (standalone returns `[lat, lng]` but GeoJSON needs `[lng, lat]`)

### MapStyleSelector

- [ ] **Step 1: Copy from standalone and adapt**

```typescript
// src/modules/trails/components/MapStyleSelector.tsx
'use client'

import mapboxgl from 'mapbox-gl'

export type MapStyle = 'standard' | 'satellite' | 'terrain' | '3d' | '3d-satellite'

const STYLES: { id: MapStyle; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
  { id: '3d', label: '3D' },
  { id: '3d-satellite', label: '3D Sat' },
]

const MAPBOX_STYLES: Record<MapStyle, string> = {
  standard: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
  '3d': 'mapbox://styles/mapbox/outdoors-v12',
  '3d-satellite': 'mapbox://styles/mapbox/satellite-streets-v12',
}

interface MapStyleSelectorProps {
  current: MapStyle
  onChange: (style: MapStyle, mapboxUrl: string) => void
}

export function getMapboxStyleUrl(style: MapStyle) {
  return MAPBOX_STYLES[style]
}

export function MapStyleSelector({ current, onChange }: MapStyleSelectorProps) {
  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1 rounded-lg bg-[var(--color-surface)] p-1 shadow">
      {STYLES.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id, MAPBOX_STYLES[s.id])}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            current === s.id
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
```

### TrailLines

- [ ] **Step 2: Port TrailLines from standalone**

Copy `src/components/map/TrailLines.tsx` from standalone to `src/modules/trails/components/TrailLines.tsx`. Adapt:
- Change import of `getDifficultyColor` to use inline function (or extract to `src/modules/trails/lib/difficulty.ts`)
- No other changes needed

```typescript
// src/modules/trails/lib/difficulty.ts
export function getDifficultyColor(physical: number, technical: number): string {
  const d = Math.max(physical, technical)
  if (d <= 2) return '#22c55e'   // green — easy
  if (d === 3) return '#3b82f6'  // blue — intermediate
  if (d === 4) return '#f59e0b'  // amber — hard
  return '#ef4444'               // red — expert
}
```

### SystemClusterMap

- [ ] **Step 3: Port SystemClusterMap from standalone**

Copy `src/components/map/SystemClusterMap.tsx` to `src/modules/trails/components/SystemClusterMap.tsx`. Adapt:
- Import `MapStyleSelector` from `./MapStyleSelector`
- Fix coordinate order bug: in `onMoveEnd` callback, the standalone incorrectly returns `{ ne: [lat, lng], sw: [lat, lng] }` — change to standard `{ ne: [lng, lat], sw: [lng, lat] }`
- Replace standalone's `MAPBOX_TOKEN` with `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`

### Enhanced TrailMap

- [ ] **Step 4: Add multi-style + 3D to existing TrailMap**

Modify `src/modules/trails/components/TrailMap.tsx` to:
- Add `style?: MapStyle` and `enable3D?: boolean` props
- Import and render `MapStyleSelector`
- Add `GeolocateControl`
- Handle style switching via `map.setStyle()` + re-add sources/layers after `style.load`
- Add 3D terrain source/layer when `enable3D` is true

### SystemClusterMapDynamic wrapper

- [ ] **Step 5: Create the dynamic wrapper for SystemClusterMap**

`SystemClusterMap` uses Mapbox GL which accesses `window` and cannot be SSR'd. Task 9's map page imports `SystemClusterMapDynamic` — create it now:

```typescript
// src/modules/trails/components/SystemClusterMapDynamic.tsx
'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { SystemClusterMap } from './SystemClusterMap'

const SystemClusterMapClient = dynamic(
  () => import('./SystemClusterMap').then((m) => m.SystemClusterMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-[var(--color-bg-secondary)]" /> }
)

export function SystemClusterMapDynamic(props: ComponentProps<typeof SystemClusterMap>) {
  return <SystemClusterMapClient {...props} />
}
```

Then add `SystemClusterMapDynamic` to the components barrel export:

```typescript
// src/modules/trails/components/index.ts — add line:
export { SystemClusterMapDynamic } from './SystemClusterMapDynamic'
```

- [ ] **Step 6: Commit map components**
```bash
git add src/modules/trails/components/
git add src/modules/trails/lib/difficulty.ts
git commit -m "feat(trails): port map components — SystemClusterMap, TrailLines, MapStyleSelector, enhanced TrailMap, dynamic wrapper"
```

---

## Task 4: Expand Queries Layer

**Files:**
- Modify: `src/modules/trails/lib/queries.ts`
- Modify: `src/modules/trails/types/index.ts`

Update `getTrailSystems()`, `getTrailSystemBySlug()`, `getTrailBySlug()`, and `getTrailList()` to include the new fields (coverImageUrl, trailheadLat/Lng, photos, isApproved POIs, etc.). Add `advancedSearchTrails()` and `getTrailsNear()`.

Key changes:
- `getTrailSystemBySlug()`: include `photos` (first 5, `isCover: true` first), `trailheadLat`, `trailheadLng`, `parkingInfo`, `seasonalNotes`, `passRequired`, `dogFriendly`, `eMtbAllowed`
- `getTrailBySlug()`: include `photos`, `pois` (where `isApproved: true`), review `body`/`helpfulCount`, GPS track `elevationProfile`
- `getTrailList()`: include `hasGpsTrack`, `features`, `averageRating`
- Add `getFeaturedSystems(limit)` function
- Add `getSystemTrailsForMap(systemId)` — only trails with GPS track, select fields for map rendering

- [ ] **Step 1: Update queries and types to match new schema fields**

- [ ] **Step 2: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add src/modules/trails/lib/queries.ts src/modules/trails/types/index.ts
git commit -m "feat(trails): expand queries with new schema fields, photos, POIs, featured systems"
```

---

## Task 5: Port Additional UI Components

**Files:**
- Create: `src/modules/trails/components/TrailCard.tsx`
- Create: `src/modules/trails/components/DifficultyDistribution.tsx`
- Create: `src/modules/trails/components/RadarChart.tsx`
- Create: `src/modules/trails/components/PhotoGallery.tsx`
- Create: `src/modules/trails/components/GetDirectionsButton.tsx`
- Create: `src/modules/trails/components/ShareButton.tsx`
- Create: `src/modules/trails/components/HelpfulButton.tsx`
- Modify: `src/modules/trails/components/index.ts`

Copy each from standalone `src/components/trail/` and adapt to monolith CSS variable conventions.

### TrailCard
Port `src/components/trail/TrailCard.tsx`. Renders compact trail info: name, type badge, difficulty, distance, rating, condition.

### DifficultyDistribution
Port `src/components/system/DifficultyDistribution.tsx`. Simple bar chart SVG showing trail count per difficulty range. Input: `trails: TrailSummary[]`.

### RadarChart
Port `src/components/trail/RadarChart.tsx`. SVG radar with 5 axes: Physical, Technical, Distance, Elevation, Rating. Supports up to 3 trails for overlay. Used on `/trails/compare`.

### PhotoGallery
Port `src/components/trail/PhotoGallery.tsx`. Carousel of trail photos with lightbox. Input: `photos: { url, caption }[]`.

### GetDirectionsButton
Port `src/components/trail/GetDirectionsButton.tsx`. Renders two buttons: "Google Maps" and "Apple Maps" deep links using trailhead lat/lng.

### ShareButton
Port `src/components/trail/ShareButton.tsx`. Uses `navigator.clipboard.writeText(window.location.href)`. Falls back to `window.open` share sheet on mobile.

### HelpfulButton
Server action for toggling helpful vote. Create `src/modules/trails/actions/toggleReviewHelpful.ts`:
```typescript
'use server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export async function toggleReviewHelpful(reviewId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  const userId = session.user.id
  const existing = await db.trailReviewHelpful.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  })
  if (existing) {
    await db.trailReviewHelpful.delete({ where: { id: existing.id } })
    await db.trailReview.update({ where: { id: reviewId }, data: { helpfulCount: { decrement: 1 } } })
  } else {
    await db.trailReviewHelpful.create({ data: { reviewId, userId } })
    await db.trailReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } })
  }
}
```

- [ ] **Step 1: Create all component files as described above**
- [ ] **Step 2: Export all new components from `src/modules/trails/components/index.ts`**
- [ ] **Step 3: Verify TypeScript compiles**
```bash
npx tsc --noEmit
```
- [ ] **Step 4: Commit**
```bash
git add src/modules/trails/components/ src/modules/trails/actions/
git commit -m "feat(trails): add TrailCard, DifficultyDistribution, RadarChart, PhotoGallery, GetDirections, Share, HelpfulButton"
```

---

## Task 6: Rewrite Explore Page

**Files:**
- Modify: `src/app/trails/explore/page.tsx`

Replace the current grid layout with `SystemClusterMap` + sidebar pattern matching the standalone's explore page.

Layout:
- Left: filter sidebar (system type, state, search text)
- Right: `SystemClusterMap` (full height, receives filtered systems as pins)
- Below on mobile: card grid fallback

Key behavior:
- Filters apply client-side via `useRouter` + searchParams
- Map `onSystemClick` navigates to `/trails/explore/[slug]`
- `onMoveEnd` updates a visible "X systems in view" counter

Since this page is currently a Server Component and needs `SystemClusterMap` (client), use this pattern:

> **Next.js 15:** `searchParams` is a `Promise` and must be awaited before accessing its properties.

```tsx
// page.tsx — Server Component, fetches data
import { SystemClusterMapDynamic } from '@/modules/trails/components'

interface Props {
  searchParams: Promise<{ type?: string; state?: string; search?: string }>
}

export default async function ExploreTrailsPage({ searchParams }: Props) {
  const params = await searchParams
  const systems = await getTrailSystems({ type: params.type, state: params.state, search: params.search })
  const pins = systems.map(s => ({ id: s.id, slug: s.slug, name: s.name, lat: s.latitude, lng: s.longitude, trailCount: s.trailCount, rating: s.averageRating }))
  return (
    <div>
      {/* filter bar */}
      <SystemClusterMapDynamic systems={pins} className="h-[70vh]" />
      {/* card grid below */}
    </div>
  )
}
```

- [ ] **Step 1: Rewrite `src/app/trails/explore/page.tsx`**
- [ ] **Step 2: Test in browser — map loads, clusters visible, clicking pin navigates**
- [ ] **Step 3: Commit**
```bash
git add src/app/trails/explore/page.tsx
git commit -m "feat(trails): rewrite explore page with cluster map"
```

---

## Task 7: Rewrite System Detail Page

**Files:**
- Modify: `src/app/trails/explore/[systemSlug]/page.tsx`

Add: cover photo, trailhead info section, weather placeholder, DifficultyDistribution chart, PhotoGallery, GetDirectionsButton.

Pattern from standalone's `src/app/systems/[slug]/page.tsx`:
- Hero with `coverImageUrl` or Mountain icon fallback
- Stats row: trail count, total miles, total vert, avg rating, ride count
- `SystemTrailMap` with trailhead marker
- Difficulty distribution chart (from trails array)
- Trail list (existing `TrailList` component)
- Info section: description, seasonal notes, pass/fee, parking, trailhead, website, phone, dog-friendly, eMTB

- [ ] **Step 1: Rewrite `src/app/trails/explore/[systemSlug]/page.tsx`**
- [ ] **Step 2: Test: system page loads with map, stats, difficulty chart**
- [ ] **Step 3: Commit**
```bash
git add src/app/trails/explore/[systemSlug]/page.tsx
git commit -m "feat(trails): rewrite system detail page with photos, trailhead info, difficulty chart"
```

---

## Task 8: Rewrite Trail Detail Page

**Files:**
- Modify: `src/app/trails/explore/[systemSlug]/[trailSlug]/page.tsx`

Add: PhotoGallery, POI list with icons, GetDirectionsButton, ShareButton, review `body` field display, HelpfulButton, TrailViewTracker.

POI type icon map (lucide-react):
```typescript
const POI_ICONS: Record<string, React.ComponentType> = {
  feature: Zap, hazard: AlertTriangle, viewpoint: Eye,
  intersection: GitFork, water: Droplets, parking: ParkingSquare,
  restroom: Activity, repair_station: Wrench, other: MapPin,
}
```

- [ ] **Step 1: Rewrite `src/app/trails/explore/[systemSlug]/[trailSlug]/page.tsx`**

Sections to add (after existing elevation profile + reviews):
- Photo gallery (if `trail.photos.length > 0`)
- Points of interest list (if `trail.pois.length > 0`)
- Directions + share buttons in the header area

Reviews: update to show `review.body` (not just `comment`), add `HelpfulButton` per review.

- [ ] **Step 2: Test: trail detail loads with all sections**
- [ ] **Step 3: Commit**
```bash
git add src/app/trails/explore/[systemSlug]/[trailSlug]/page.tsx
git commit -m "feat(trails): rewrite trail detail page with photos, POIs, directions, helpful votes"
```

---

## Task 9: Full Map Page

**Files:**
- Modify: `src/app/trails/map/page.tsx`

Replace stub with full-screen `SystemClusterMap`. Add `MapStyleSelector` control. `onSystemClick` opens a drawer or navigates.

```tsx
// src/app/trails/map/page.tsx
import { Suspense } from 'react'
import { getTrailSystems } from '@/modules/trails/lib/queries'
import { SystemClusterMapDynamic } from '@/modules/trails/components'

export default async function TrailMapPage() {
  const systems = await getTrailSystems({})
  const pins = systems.map(s => ({ id: s.id, slug: s.slug, name: s.name, lat: s.latitude, lng: s.longitude, trailCount: s.trailCount, rating: s.averageRating }))
  return (
    <div className="h-[calc(100vh-var(--nav-height))]">
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <SystemClusterMapDynamic systems={pins} className="h-full" />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 1: Rewrite `src/app/trails/map/page.tsx`**
- [ ] **Step 2: Test: full-screen map loads**
- [ ] **Step 3: Commit**
```bash
git add src/app/trails/map/page.tsx
git commit -m "feat(trails): full-screen map page with cluster map"
```

---

## Task 10: Final Verification + PR

- [ ] **Step 1: Full build check**
```bash
npx tsc --noEmit && npx next build
```
Expected: clean build, no errors.

- [ ] **Step 2: Smoke test all routes in browser**
- `/trails` — landing page
- `/trails/explore` — cluster map with systems visible
- `/trails/map` — full-screen map
- `/trails/explore/[any-system-slug]` — system detail with map + trails
- `/trails/explore/[system]/[trail]` — trail detail with elevation + reviews

- [ ] **Step 3: Push branch and open PR**
```bash
git push -u origin feature/trail-maps-migration
```

---

## Deferred (future PRs)

These features exist in the standalone but are out of scope for this migration:

- **Offline map support** — PWA, service workers, OfflineMapRegion model
- **GPS Discovery admin** — Auto-detect trails from ride logs, GpsDiscoveryCandidate
- **Leaderboard** — `/trails/leaderboard` activity rankings
- **Weather widget** — Requires external weather API key
- **User submissions** — Trail/system submit forms + approval queue
- **Print view** — `/trails/explore/[system]/[trail]/print`
- **User profiles** — `/u/[username]` trail contribution stats
- **i18n** — next-intl already installed, not wired
- **Photo upload** — User-contributed photos (PhotoUploadForm)
- **Admin panel** — GPX bulk import, OSM import, edit pages
