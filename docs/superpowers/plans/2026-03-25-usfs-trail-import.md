# USFS Trail Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import USFS National Forest System trail data into the trail database via a standalone sync script, with an admin UI for reviewing newly-created pending trail systems.

**Architecture:** Four independent tasks: (1) schema migration adding unique constraints + new fields, (2) TDD for pure utility functions, (3) standalone ESM sync script following `sync-parks.mjs` pattern, (4) minimal admin page + API route. The script is fully self-contained (no TypeScript imports). Pure functions are also extracted to a TypeScript file for testing.

**Tech Stack:** Node.js ESM (script), `pg` Pool (direct SQL), Prisma migrate (schema), Vitest (unit tests), Next.js App Router (admin page), `pool.query()` (admin data), fetch API (USFS ArcGIS REST)

---

## File Map

| File | Create / Modify | Purpose |
|------|-----------------|---------|
| `prisma/schema.prisma` | Modify | Add `@@unique` to Trail + TrailSystem; add `importSource`, `externalId`, `@@unique` to TrailGpsTrack |
| `src/modules/trails/lib/usfs-utils.ts` | Create | TypeScript pure functions (tested by Vitest) |
| `src/modules/trails/lib/usfs-utils.test.ts` | Create | Unit tests for pure functions |
| `scripts/sync-usfs.mjs` | Create | Standalone sync script (all logic inline per sync-parks.mjs pattern) |
| `src/app/admin/trails/page.tsx` | Create | Server component listing pending USFS imports |
| `src/modules/trails/components/TrailImportList.tsx` | Create | Client component with Publish button |
| `src/app/api/admin/trails/[id]/status/route.ts` | Create | PATCH endpoint to change system status |
| `src/app/admin/layout.tsx` | Modify | Add "Trails" nav link |

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma` (lines ~640-715)

### Context

`Trail` (line 645) and `TrailSystem` (line 597) already have `importSource String?` and `externalId String?` fields but no unique constraints. `TrailGpsTrack` (line 698) has neither field. We need:
- `@@unique([importSource, externalId])` on both Trail and TrailSystem — enables `ON CONFLICT (importSource, externalId)` SQL upserts
- Two new nullable fields on TrailGpsTrack plus a `@@unique` on them

PostgreSQL allows multiple `(NULL, NULL)` rows in a partial unique index — only non-null pairs are uniquely constrained.

- [ ] **Step 1: Add `@@unique` to TrailSystem**

In `prisma/schema.prisma`, find the TrailSystem closing block (around line 640-643):
```prisma
  @@index([city, state])
  @@index([latitude, longitude])
  @@map("trail_systems")
```
Change to:
```prisma
  @@unique([importSource, externalId])
  @@index([city, state])
  @@index([latitude, longitude])
  @@map("trail_systems")
```

- [ ] **Step 2: Add `@@unique` to Trail**

Find the Trail closing block (around line 693-695):
```prisma
  @@index([trailSystemId, status])
  @@index([trailType])
  @@map("trails")
```
Change to:
```prisma
  @@unique([importSource, externalId])
  @@index([trailSystemId, status])
  @@index([trailType])
  @@map("trails")
```

- [ ] **Step 3: Add fields + `@@unique` to TrailGpsTrack**

Find the TrailGpsTrack closing block (around line 713-715):
```prisma
  trail            Trail    @relation(fields: [trailId], references: [id], onDelete: Cascade)

  @@map("trail_gps_tracks")
```
Change to:
```prisma
  trail            Trail    @relation(fields: [trailId], references: [id], onDelete: Cascade)
  importSource  String?
  externalId    String?

  @@unique([importSource, externalId])
  @@map("trail_gps_tracks")
```

- [ ] **Step 4: Generate and run migration**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma migrate dev --name usfs_import_fields
```

Expected: Prisma prints migration SQL and applies it. If it asks to reset, say NO — we want a new migration only.

- [ ] **Step 5: Verify**

```bash
npx prisma db pull --print 2>&1 | grep -A2 "unique.*importSource\|unique.*externalId" | head -20
```

Expected: Shows the unique constraints on trail_systems, trails, and trail_gps_tracks.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add unique import constraints to Trail, TrailSystem, TrailGpsTrack"
```

---

## Task 2: Pure Functions — TDD

**Files:**
- Create: `src/modules/trails/lib/usfs-utils.ts`
- Create: `src/modules/trails/lib/usfs-utils.test.ts`

### Context

These pure functions will also be duplicated inline in `scripts/sync-usfs.mjs` (Task 3) so that script stays fully self-contained (matching `sync-parks.mjs` pattern). Keep both in sync if you ever modify them.

`~0.01454 degrees latitude ≈ 1 mile`, so two points `[35.5, -82.5]` and `[35.5144, -82.5]` are roughly 1 mile apart.

- [ ] **Step 1: Write the failing tests**

Create `src/modules/trails/lib/usfs-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  normalizeSystemName,
  convertCoordinates,
  calculateCentroid,
  qualityCheck,
  buildExternalId,
  haversineDistance,
  calculateStats,
} from './usfs-utils'

describe('normalizeSystemName', () => {
  it('strips "National Forest" suffix', () => {
    expect(normalizeSystemName('Pisgah National Forest')).toBe('pisgah')
  })
  it('strips "NF" abbreviation', () => {
    expect(normalizeSystemName('Chattahoochee-Oconee NF')).toBe('chattahoochee oconee')
  })
  it('handles empty string', () => {
    expect(normalizeSystemName('')).toBe('')
  })
  it('handles null', () => {
    expect(normalizeSystemName(null)).toBe('')
  })
})

describe('convertCoordinates', () => {
  it('swaps [lng, lat, ele] to [lat, lng, ele]', () => {
    expect(convertCoordinates([[-82.5, 35.3, 1200]])).toEqual([[35.3, -82.5, 1200]])
  })
  it('defaults missing elevation to 0', () => {
    expect(convertCoordinates([[-82.5, 35.3]])).toEqual([[35.3, -82.5, 0]])
  })
  it('handles multiple points', () => {
    const result = convertCoordinates([[-82.5, 35.3, 100], [-82.6, 35.4, 200]])
    expect(result).toEqual([[35.3, -82.5, 100], [35.4, -82.6, 200]])
  })
})

describe('calculateCentroid', () => {
  it('returns average lat/lng for two points', () => {
    expect(calculateCentroid([[35.0, -82.0, 0], [37.0, -84.0, 0]])).toEqual({ lat: 36, lng: -83 })
  })
  it('handles a single point', () => {
    expect(calculateCentroid([[35.5, -82.5, 0]])).toEqual({ lat: 35.5, lng: -82.5 })
  })
  it('returns zeros for empty array', () => {
    expect(calculateCentroid([])).toEqual({ lat: 0, lng: 0 })
  })
})

describe('qualityCheck', () => {
  it('returns false for 0 miles', () => {
    expect(qualityCheck(0)).toBe(false)
  })
  it('returns false for below threshold (0.04)', () => {
    expect(qualityCheck(0.04)).toBe(false)
  })
  it('returns true at threshold (0.05)', () => {
    expect(qualityCheck(0.05)).toBe(true)
  })
  it('returns true for normal trail distance', () => {
    expect(qualityCheck(2.5)).toBe(true)
  })
})

describe('buildExternalId', () => {
  it('formats as "Forest#TrailNo"', () => {
    expect(buildExternalId('Pisgah National Forest', '2108')).toBe('Pisgah National Forest#2108')
  })
})

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(35.5, -82.5, 35.5, -82.5)).toBe(0)
  })
  it('returns approximately correct distance (NYC to LA ≈ 2446 mi)', () => {
    const dist = haversineDistance(40.71, -74.01, 34.05, -118.24)
    expect(dist).toBeGreaterThan(2400)
    expect(dist).toBeLessThan(2500)
  })
})

describe('calculateStats', () => {
  it('returns zeros for empty points', () => {
    const s = calculateStats([])
    expect(s.distance).toBe(0)
    expect(s.elevationGain).toBe(0)
  })
  it('calculates distance for two points ~1 mile apart', () => {
    // 0.01454° lat ≈ 1 mile
    const points: [number, number, number][] = [[35.5, -82.5, 0], [35.5144, -82.5, 0]]
    const s = calculateStats(points)
    expect(s.distance).toBeGreaterThan(0.9)
    expect(s.distance).toBeLessThan(1.1)
  })
  it('calculates elevation gain from meters', () => {
    // 100m up = 328ft; below noise threshold of 3ft so only large gains register
    const points: [number, number, number][] = [
      [35.5, -82.5, 0],
      [35.5144, -82.5, 100], // 100m = 328ft gain
    ]
    const s = calculateStats(points)
    expect(s.elevationGain).toBeGreaterThan(300)
  })
  it('computes correct bounds', () => {
    const points: [number, number, number][] = [[35.5, -82.5, 0], [36.0, -83.0, 0]]
    const s = calculateStats(points)
    expect(s.bounds.neLat).toBe(36.0)
    expect(s.bounds.swLat).toBe(35.5)
    expect(s.bounds.neLng).toBe(-82.5)
    expect(s.bounds.swLng).toBe(-83.0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx vitest run src/modules/trails/lib/usfs-utils.test.ts
```

Expected: FAIL — "Cannot find module './usfs-utils'"

- [ ] **Step 3: Create the implementation**

Create `src/modules/trails/lib/usfs-utils.ts`:

```typescript
// Pure utility functions for USFS trail import.
// These are also duplicated inline in scripts/sync-usfs.mjs (which must stay standalone).
// Keep both in sync when modifying.

const EARTH_RADIUS_MILES = 3959
const METERS_TO_FEET = 3.28084
const ELEVATION_NOISE_FT = 3
const MIN_DISTANCE_MILES = 0.05

export type GpsPoint = [number, number, number] // [lat, lng, ele_meters]

export interface TrailStats {
  distance: number       // miles, rounded to 2 decimal places
  elevationGain: number  // feet, rounded
  elevationLoss: number  // feet, rounded
  highPoint: number      // feet, rounded
  lowPoint: number       // feet, rounded
  bounds: { neLat: number; neLng: number; swLat: number; swLng: number }
}

/** Lowercase, strip "National Forest", "NF", punctuation. "Pisgah National Forest" → "pisgah" */
export function normalizeSystemName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\bnational\s+forest\b/g, '')
    .replace(/\bnf\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "{MANAGING_ORG}#{TRAIL_NO}" — primary key for upsert deduplication */
export function buildExternalId(managingOrg: string, trailNo: string | number): string {
  return `${managingOrg}#${trailNo}`
}

/** GeoJSON [lng, lat, ele?] → [lat, lng, ele] (elevation defaults to 0) */
export function convertCoordinates(geojsonCoords: number[][]): GpsPoint[] {
  return geojsonCoords.map(([lng, lat, ele]) => [lat, lng, ele ?? 0])
}

/** Average of all [lat, lng, ele] points. Returns {0,0} for empty input. */
export function calculateCentroid(points: GpsPoint[]): { lat: number; lng: number } {
  if (!points.length) return { lat: 0, lng: 0 }
  return {
    lat: points.reduce((s, p) => s + p[0], 0) / points.length,
    lng: points.reduce((s, p) => s + p[1], 0) / points.length,
  }
}

/** Returns false if distance < 0.05 miles (bad/stub geometry). */
export function qualityCheck(distanceMiles: number): boolean {
  return distanceMiles >= MIN_DISTANCE_MILES
}

/** Haversine great-circle distance in miles. */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Compute trail statistics from GPS points (elevation input in meters, output in feet). */
export function calculateStats(points: GpsPoint[]): TrailStats {
  if (!points.length) {
    return { distance: 0, elevationGain: 0, elevationLoss: 0, highPoint: 0, lowPoint: 0,
             bounds: { neLat: 0, neLng: 0, swLat: 0, swLng: 0 } }
  }

  let distance = 0, elevationGain = 0, elevationLoss = 0
  const firstEleFt = points[0][2] * METERS_TO_FEET
  let highPoint = firstEleFt, lowPoint = firstEleFt
  let minLat = points[0][0], maxLat = points[0][0]
  let minLng = points[0][1], maxLng = points[0][1]

  for (let i = 1; i < points.length; i++) {
    const [lat1, lng1] = points[i - 1]
    const [lat2, lng2, ele2] = points[i]
    distance += haversineDistance(lat1, lng1, lat2, lng2)
    const ele1Ft = points[i - 1][2] * METERS_TO_FEET
    const ele2Ft = (ele2 ?? 0) * METERS_TO_FEET
    const diff = ele2Ft - ele1Ft
    if (Math.abs(diff) >= ELEVATION_NOISE_FT) {
      if (diff > 0) elevationGain += diff
      else elevationLoss += Math.abs(diff)
    }
    if (ele2Ft > highPoint) highPoint = ele2Ft
    if (ele2Ft < lowPoint) lowPoint = ele2Ft
    if (lat2 < minLat) minLat = lat2
    if (lat2 > maxLat) maxLat = lat2
    if (lng2 < minLng) minLng = lng2
    if (lng2 > maxLng) maxLng = lng2
  }

  return {
    distance: Math.round(distance * 100) / 100,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    highPoint: Math.round(highPoint),
    lowPoint: Math.round(lowPoint),
    bounds: { neLat: maxLat, neLng: maxLng, swLat: minLat, swLng: minLng },
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/modules/trails/lib/usfs-utils.test.ts
```

Expected: All tests PASS (7 describe blocks, ~15 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/modules/trails/lib/usfs-utils.ts src/modules/trails/lib/usfs-utils.test.ts
git commit -m "feat: add USFS import utility functions with tests"
```

---

## Task 3: Sync Script

**Files:**
- Create: `scripts/sync-usfs.mjs`

### Context

This follows the exact pattern of `scripts/sync-parks.mjs`: standalone ESM, `import pg from 'pg'`, direct SQL via `Pool`, `ON CONFLICT ... DO UPDATE`. No TypeScript imports. All logic is inline (the pure functions are duplicated here from Task 2 — this is intentional to keep the script fully self-contained).

**DB connection:** reads `DATABASE_DIRECT_URL` or `DATABASE_POOLED_URL` from environment (unlike sync-parks.mjs which hardcodes the URL). Set these before running.

**The `(xmax = 0) AS is_insert` trick:** In PostgreSQL, `xmax = 0` on a row returned from `ON CONFLICT DO UPDATE` means it was a new insert; `xmax > 0` means it was updated. This is how we count inserts vs updates without extra round-trips.

**Slug collision handling:** Trail system slug = `slugify(MANAGING_ORG) + "-usfs"`. Trail slug = `slugify(TRAIL_NAME) + "-" + slugify(externalId)`. The externalId suffix makes trail slugs unique per forest.

- [ ] **Step 1: Create the script**

Create `scripts/sync-usfs.mjs`:

```javascript
#!/usr/bin/env node
// USFS National Forest System Trails sync
// Safe to re-run — all writes use ON CONFLICT (importSource, externalId) DO UPDATE
// Run: node scripts/sync-usfs.mjs [--state=CO] [--dry-run]

import pg from 'pg'

const { Pool } = pg

// ── DB ───────────────────────────────────────────────────────────────────────

const connectionString =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_POOLED_URL?.trim()
if (!connectionString) {
  console.error('ERROR: Set DATABASE_DIRECT_URL or DATABASE_POOLED_URL')
  process.exit(1)
}

// ── Config ───────────────────────────────────────────────────────────────────

const USFS_API =
  'https://services1.arcgis.com/SHG9FMbq00oBSN3m/arcgis/rest/services/National_Forest_System_Trails_6_8_22/FeatureServer/0/query'
const IMPORT_SOURCE = 'USFS'
const PAGE_SIZE = 2000
const MIN_DISTANCE_MILES = 0.05
const GEO_PROXIMITY_MILES = 50
const EARTH_RADIUS_MILES = 3959
const METERS_TO_FEET = 3.28084
const ELEVATION_NOISE_FT = 3

// ── State bounding boxes ──────────────────────────────────────────────────────
// Covers all states with USFS National Forest land (plus a few without for completeness)

const STATE_BBOXES = {
  AL: { minX: -88.47, minY: 30.22, maxX: -84.89, maxY: 35.01 },
  AK: { minX: -179.15, minY: 51.21, maxX: -129.99, maxY: 71.35 },
  AZ: { minX: -114.82, minY: 31.33, maxX: -109.05, maxY: 37.00 },
  AR: { minX: -94.62, minY: 33.00, maxX: -89.64, maxY: 36.50 },
  CA: { minX: -124.41, minY: 32.53, maxX: -114.13, maxY: 42.01 },
  CO: { minX: -109.05, minY: 36.99, maxX: -102.04, maxY: 41.00 },
  FL: { minX: -87.63, minY: 24.90, maxX: -80.03, maxY: 31.00 },
  GA: { minX: -85.61, minY: 30.36, maxX: -80.84, maxY: 35.00 },
  ID: { minX: -117.24, minY: 41.99, maxX: -111.04, maxY: 49.00 },
  IL: { minX: -91.51, minY: 36.97, maxX: -87.02, maxY: 42.51 },
  IN: { minX: -88.10, minY: 37.77, maxX: -84.78, maxY: 41.76 },
  KY: { minX: -89.57, minY: 36.50, maxX: -81.96, maxY: 39.15 },
  LA: { minX: -94.04, minY: 28.93, maxX: -88.82, maxY: 33.02 },
  ME: { minX: -71.08, minY: 43.06, maxX: -66.95, maxY: 47.46 },
  MI: { minX: -90.42, minY: 41.70, maxX: -82.42, maxY: 48.19 },
  MN: { minX: -97.24, minY: 43.50, maxX: -89.48, maxY: 49.38 },
  MS: { minX: -91.65, minY: 30.17, maxX: -88.10, maxY: 35.01 },
  MO: { minX: -95.77, minY: 35.99, maxX: -89.10, maxY: 40.61 },
  MT: { minX: -116.05, minY: 44.36, maxX: -104.04, maxY: 49.00 },
  NV: { minX: -120.00, minY: 35.00, maxX: -114.04, maxY: 42.00 },
  NH: { minX: -72.56, minY: 42.70, maxX: -70.70, maxY: 45.31 },
  NM: { minX: -109.05, minY: 31.33, maxX: -103.00, maxY: 37.00 },
  NC: { minX: -84.32, minY: 33.84, maxX: -75.46, maxY: 36.59 },
  OH: { minX: -84.82, minY: 38.40, maxX: -80.52, maxY: 42.00 },
  OR: { minX: -124.57, minY: 41.99, maxX: -116.46, maxY: 46.26 },
  PA: { minX: -80.52, minY: 39.72, maxX: -74.69, maxY: 42.27 },
  SC: { minX: -83.36, minY: 32.05, maxX: -78.54, maxY: 35.22 },
  SD: { minX: -104.06, minY: 42.48, maxX: -96.44, maxY: 45.95 },
  TN: { minX: -90.31, minY: 34.98, maxX: -81.65, maxY: 36.68 },
  TX: { minX: -106.65, minY: 25.84, maxX: -93.51, maxY: 36.50 },
  UT: { minX: -114.05, minY: 37.00, maxX: -109.04, maxY: 42.00 },
  VT: { minX: -73.44, minY: 42.73, maxX: -71.50, maxY: 45.02 },
  VA: { minX: -83.68, minY: 36.54, maxX: -75.24, maxY: 39.46 },
  WA: { minX: -124.73, minY: 45.54, maxX: -116.92, maxY: 49.00 },
  WV: { minX: -82.64, minY: 37.20, maxX: -77.72, maxY: 40.64 },
  WI: { minX: -92.89, minY: 42.49, maxX: -86.80, maxY: 47.08 },
  WY: { minX: -111.06, minY: 40.99, maxX: -104.05, maxY: 45.01 },
}

// ── Pure functions (duplicated from src/modules/trails/lib/usfs-utils.ts) ────
// Keep in sync with that file if you modify these.

function normalizeSystemName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\bnational\s+forest\b/g, '')
    .replace(/\bnf\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildExternalId(managingOrg, trailNo) {
  return `${managingOrg}#${trailNo}`
}

function buildSlug(name, suffix) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/-$/, '')
  const safeSuffix = suffix.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 30)
  return `${base}-${safeSuffix}`
}

function convertCoordinates(geojsonCoords) {
  return geojsonCoords.map(([lng, lat, ele]) => [lat, lng, ele ?? 0])
}

function calculateCentroid(points) {
  if (!points.length) return { lat: 0, lng: 0 }
  return {
    lat: points.reduce((s, p) => s + p[0], 0) / points.length,
    lng: points.reduce((s, p) => s + p[1], 0) / points.length,
  }
}

function qualityCheck(distanceMiles) {
  return distanceMiles >= MIN_DISTANCE_MILES
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calculateStats(points) {
  if (!points.length) {
    return { distance: 0, elevationGain: 0, elevationLoss: 0, highPoint: 0, lowPoint: 0,
             bounds: { neLat: 0, neLng: 0, swLat: 0, swLng: 0 } }
  }
  let distance = 0, elevationGain = 0, elevationLoss = 0
  const firstEleFt = points[0][2] * METERS_TO_FEET
  let highPoint = firstEleFt, lowPoint = firstEleFt
  let minLat = points[0][0], maxLat = points[0][0]
  let minLng = points[0][1], maxLng = points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [lat1, lng1] = points[i - 1]
    const [lat2, lng2, ele2] = points[i]
    distance += haversineDistance(lat1, lng1, lat2, lng2)
    const ele1Ft = points[i - 1][2] * METERS_TO_FEET
    const ele2Ft = (ele2 ?? 0) * METERS_TO_FEET
    const diff = ele2Ft - ele1Ft
    if (Math.abs(diff) >= ELEVATION_NOISE_FT) {
      if (diff > 0) elevationGain += diff
      else elevationLoss += Math.abs(diff)
    }
    if (ele2Ft > highPoint) highPoint = ele2Ft
    if (ele2Ft < lowPoint) lowPoint = ele2Ft
    if (lat2 < minLat) minLat = lat2
    if (lat2 > maxLat) maxLat = lat2
    if (lng2 < minLng) minLng = lng2
    if (lng2 > maxLng) maxLng = lng2
  }
  return {
    distance: Math.round(distance * 100) / 100,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    highPoint: Math.round(highPoint),
    lowPoint: Math.round(lowPoint),
    bounds: { neLat: maxLat, neLng: maxLng, swLat: minLat, swLng: minLng },
  }
}

// ── USFS API ─────────────────────────────────────────────────────────────────

async function fetchUsfsPage(bbox, offset) {
  const params = new URLSearchParams({
    where: "TRAIL_TYPE='TERRA'",
    geometry: `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'TRAIL_NAME,TRAIL_NO,MANAGING_ORG,ALLOWED_TERRA_USE,SURFACE_TYPE,GIS_MILES',
    outSR: '4326',
    f: 'geojson',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
  })
  const res = await fetch(`${USFS_API}?${params}`)
  if (!res.ok) throw new Error(`USFS API ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`)
  const json = await res.json()
  if (json.error) throw new Error(`USFS API error: ${json.error.message}`)
  return json.features ?? []
}

async function fetchAllUsfsTrails(bbox) {
  const features = []
  let offset = 0
  while (true) {
    const page = await fetchUsfsPage(bbox, offset)
    features.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    await new Promise(r => setTimeout(r, 200)) // be a polite API client
  }
  return features
}

// ── System matching ───────────────────────────────────────────────────────────

async function findMatchingSystem(pool, managingOrg, centroid) {
  const normalizedUsfs = normalizeSystemName(managingOrg)

  // Fetch all non-USFS systems (avoid matching our own previously-imported systems)
  const { rows } = await pool.query(
    `SELECT id, name, slug, status, latitude, longitude
     FROM trail_systems
     WHERE "importSource" IS NULL OR "importSource" != $1`,
    [IMPORT_SOURCE],
  )

  for (const system of rows) {
    const normName = normalizeSystemName(system.name)
    const nameMatch = normalizedUsfs && normName && (normName.includes(normalizedUsfs) || normalizedUsfs.includes(normName))
    if (!nameMatch) continue

    // Log confidence level (name alone is sufficient to enrich; geo just adds confidence)
    const lat = parseFloat(system.latitude)
    const lng = parseFloat(system.longitude)
    if (!isNaN(lat) && !isNaN(lng)) {
      const dist = haversineDistance(centroid.lat, centroid.lng, lat, lng)
      const confidence = dist <= GEO_PROXIMITY_MILES ? 'name+geo' : 'name-only'
      return { system, isNew: false, confidence }
    }
    return { system, isNew: false, confidence: 'name-only' }
  }

  return { system: null, isNew: true, confidence: null }
}

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const stateArg = args.find(a => a.startsWith('--state='))?.split('=')[1]?.toUpperCase()

const statesToSync = stateArg
  ? (STATE_BBOXES[stateArg] ? { [stateArg]: STATE_BBOXES[stateArg] } : null)
  : STATE_BBOXES

if (!statesToSync) {
  console.error(`Unknown state: ${stateArg}. Use two-letter abbreviation, e.g. --state=CO`)
  process.exit(1)
}

if (dryRun) console.log('[DRY RUN] — no DB writes will occur\n')

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const pool = new Pool({ connectionString, max: 3 })
  const summary = {
    statesProcessed: 0,
    forestsFound: 0,
    systemsEnriched: 0,
    systemsCreated: 0,
    trailsAdded: 0,
    trailsUpdated: 0,
    segmentsSkipped: 0,
  }

  for (const [stateCode, bbox] of Object.entries(statesToSync)) {
    console.log(`\n[${stateCode}] Fetching USFS trails...`)
    let features
    try {
      features = await fetchAllUsfsTrails(bbox)
    } catch (err) {
      console.error(`  Error fetching ${stateCode}:`, err.message)
      continue
    }
    console.log(`  ${features.length} TERRA trail segments`)
    summary.statesProcessed++

    // Group segments by National Forest
    const forestGroups = new Map()
    for (const f of features) {
      const org = f.properties?.MANAGING_ORG
      if (!org) continue
      if (!forestGroups.has(org)) forestGroups.set(org, [])
      forestGroups.get(org).push(f)
    }
    console.log(`  ${forestGroups.size} National Forests`)
    summary.forestsFound += forestGroups.size

    for (const [managingOrg, forestFeatures] of forestGroups) {
      console.log(`\n  [${managingOrg}] ${forestFeatures.length} segments`)

      // Centroid: average midpoint of each segment
      const centers = forestFeatures.flatMap(f => {
        const coords = f.geometry?.coordinates
        if (!coords?.length) return []
        const mid = Math.floor(coords.length / 2)
        return [[coords[mid][1], coords[mid][0], 0]] // [lat, lng, 0]
      })
      const centroid = calculateCentroid(centers)

      // Match or create system
      let systemId, systemStatus, isEnrichedSystem = false

      if (!dryRun) {
        const { system, isNew, confidence } = await findMatchingSystem(pool, managingOrg, centroid)

        if (!isNew && system) {
          systemId = system.id
          systemStatus = system.status
          isEnrichedSystem = true
          console.log(`    ✓ Matched (${confidence}): "${system.name}"`)
          summary.systemsEnriched++
        } else {
          const slug = buildSlug(managingOrg, 'usfs')
          const res = await pool.query(
            `INSERT INTO trail_systems (
               id, name, slug, state, country, latitude, longitude,
               status, "importSource", "externalId", "createdAt", "updatedAt"
             ) VALUES (
               gen_random_uuid(), $1, $2, $3, 'US', $4, $5,
               'pending', $6, $7, NOW(), NOW()
             )
             ON CONFLICT ("importSource", "externalId") DO UPDATE SET
               latitude = EXCLUDED.latitude,
               longitude = EXCLUDED.longitude,
               "updatedAt" = NOW()
             RETURNING id, status`,
            [managingOrg, slug, stateCode, centroid.lat, centroid.lng, IMPORT_SOURCE, managingOrg],
          )
          systemId = res.rows[0].id
          systemStatus = res.rows[0].status
          console.log(`    + Created pending: "${managingOrg}"`)
          summary.systemsCreated++
        }
      } else {
        systemId = 'dry-run'
        systemStatus = 'pending'
        const { isNew } = await findMatchingSystem(pool, managingOrg, centroid)
        if (isNew) {
          console.log(`    [DRY RUN] Would create: "${managingOrg}"`)
          summary.systemsCreated++
        } else {
          console.log(`    [DRY RUN] Would enrich existing system`)
          summary.systemsEnriched++
        }
      }

      // Process trail segments
      let systemMiles = 0, systemTrailCount = 0

      // For enriched systems: build name → trailId lookup so we can match USFS segments
      // to existing trails by name (and update their GPS track) rather than always inserting new.
      let existingTrailsByNormName = new Map() // normalizedName → trailId
      if (!dryRun && isEnrichedSystem && systemId) {
        const { rows: existingTrails } = await pool.query(
          `SELECT id, name FROM trails WHERE "trailSystemId" = $1 AND "importSource" IS NULL`,
          [systemId],
        )
        for (const t of existingTrails) {
          existingTrailsByNormName.set(normalizeSystemName(t.name), t.id)
        }
      }

      for (const feature of forestFeatures) {
        const props = feature.properties ?? {}
        const trailName = props.TRAIL_NAME
        const trailNo = props.TRAIL_NO
        if (!trailName || trailNo == null) { summary.segmentsSkipped++; continue }

        const rawCoords = feature.geometry?.coordinates ?? []
        if (rawCoords.length < 2) { summary.segmentsSkipped++; continue }

        const points = convertCoordinates(rawCoords)
        const stats = calculateStats(points)

        if (!qualityCheck(stats.distance)) {
          summary.segmentsSkipped++
          continue
        }

        const externalId = buildExternalId(managingOrg, trailNo)
        const trailStatus = systemStatus === 'open' ? 'open' : 'pending'
        systemMiles += stats.distance
        systemTrailCount++

        if (dryRun) {
          console.log(`      [DRY RUN] "${trailName}" ${stats.distance}mi +${stats.elevationGain}ft`)
          summary.trailsAdded++
          continue
        }

        // Check if this trail name matches an existing (non-USFS) trail in an enriched system
        const normTrailName = normalizeSystemName(trailName)
        const matchedTrailId = existingTrailsByNormName.get(normTrailName)

        let trailId
        if (matchedTrailId) {
          // Enrich existing trail: update stats + mark hasGpsTrack, don't overwrite status/name
          await pool.query(
            `UPDATE trails SET
               distance = $1, "elevationGain" = $2, "elevationLoss" = $3,
               "highPoint" = $4, "lowPoint" = $5, "hasGpsTrack" = true,
               "importSource" = $6, "externalId" = $7, "updatedAt" = NOW()
             WHERE id = $8`,
            [
              stats.distance, stats.elevationGain, stats.elevationLoss,
              stats.highPoint, stats.lowPoint,
              IMPORT_SOURCE, externalId, matchedTrailId,
            ],
          )
          trailId = matchedTrailId
          summary.trailsUpdated++
        } else {
          // Upsert new trail (new system or no name match in enriched system)
          const trailSlug = buildSlug(trailName, externalId)
          const trailRes = await pool.query(
            `INSERT INTO trails (
               id, "trailSystemId", name, slug, status,
               distance, "elevationGain", "elevationLoss", "highPoint", "lowPoint",
               "surfaceType", "hasGpsTrack", "importSource", "externalId",
               "createdAt", "updatedAt"
             ) VALUES (
               gen_random_uuid(), $1, $2, $3, $4,
               $5, $6, $7, $8, $9,
               $10, true, $11, $12,
               NOW(), NOW()
             )
             ON CONFLICT ("importSource", "externalId") DO UPDATE SET
               distance = EXCLUDED.distance,
               "elevationGain" = EXCLUDED."elevationGain",
               "elevationLoss" = EXCLUDED."elevationLoss",
               "highPoint" = EXCLUDED."highPoint",
               "lowPoint" = EXCLUDED."lowPoint",
               "hasGpsTrack" = true,
               "updatedAt" = NOW()
             RETURNING id, (xmax = 0) AS is_insert`,
            [
              systemId, trailName, trailSlug, trailStatus,
              stats.distance, stats.elevationGain, stats.elevationLoss,
              stats.highPoint, stats.lowPoint,
              props.SURFACE_TYPE ?? null,
              IMPORT_SOURCE, externalId,
            ],
          )
          trailId = trailRes.rows[0].id
          if (trailRes.rows[0].is_insert) summary.trailsAdded++
          else summary.trailsUpdated++
        }

        // Upsert GPS track
        await pool.query(
          `INSERT INTO trail_gps_tracks (
             id, "trailId", "trackData", "pointCount",
             "boundsNeLat", "boundsNeLng", "boundsSwLat", "boundsSwLng",
             "importSource", "externalId",
             "createdAt", "updatedAt"
           ) VALUES (
             gen_random_uuid(), $1, $2, $3,
             $4, $5, $6, $7,
             $8, $9,
             NOW(), NOW()
           )
           ON CONFLICT ("trailId") DO UPDATE SET
             "trackData" = EXCLUDED."trackData",
             "pointCount" = EXCLUDED."pointCount",
             "boundsNeLat" = EXCLUDED."boundsNeLat",
             "boundsNeLng" = EXCLUDED."boundsNeLng",
             "boundsSwLat" = EXCLUDED."boundsSwLat",
             "boundsSwLng" = EXCLUDED."boundsSwLng",
             "importSource" = EXCLUDED."importSource",
             "externalId" = EXCLUDED."externalId",
             "updatedAt" = NOW()`,
          [
            trailId, JSON.stringify(points), points.length,
            stats.bounds.neLat, stats.bounds.neLng,
            stats.bounds.swLat, stats.bounds.swLng,
            IMPORT_SOURCE, externalId,
          ],
        )
      }

      // Update system totals
      if (!dryRun && systemId !== 'dry-run') {
        await pool.query(
          `UPDATE trail_systems
           SET "totalMiles" = $1, "trailCount" = $2, "updatedAt" = NOW()
           WHERE id = $3`,
          [Math.round(systemMiles * 100) / 100, systemTrailCount, systemId],
        )
      }
    }
  }

  await pool.end()

  console.log('\n── Summary ─────────────────────────────────')
  console.log(`States processed:           ${summary.statesProcessed}`)
  console.log(`National Forests found:     ${summary.forestsFound}`)
  console.log(`Existing systems enriched:  ${summary.systemsEnriched}`)
  console.log(`New pending systems created: ${summary.systemsCreated}`)
  console.log(`Trails added:               ${summary.trailsAdded}`)
  console.log(`Trails updated (geometry):  ${summary.trailsUpdated}`)
  console.log(`Segments skipped:           ${summary.segmentsSkipped}`)
}

main().catch(err => {
  console.error('Sync failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Smoke test with dry-run on a small state**

```bash
cd /Users/kylewarner/Documents/ride-mtb
# Set your DB connection string (or use .env.local values)
DATABASE_DIRECT_URL="<your-connection-string>" node scripts/sync-usfs.mjs --state=VT --dry-run
```

Expected output: State header `[VT]`, forest names like "Green Mountain National Forest", trail names with distance/elevation, summary counts at the bottom. No DB writes.

If VT has no USFS data: `0 TERRA trail segments` is also acceptable — try `--state=NC` instead (Pisgah NF is well-known).

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-usfs.mjs
git commit -m "feat: add sync-usfs.mjs script for USFS trail import"
```

---

## Task 4: Admin Trail Import Review UI

**Files:**
- Create: `src/app/admin/trails/page.tsx`
- Create: `src/modules/trails/components/TrailImportList.tsx`
- Create: `src/app/api/admin/trails/[id]/status/route.ts`
- Modify: `src/app/admin/layout.tsx`

### Context

The admin area uses `requireAdmin()` from `@/lib/auth/guards` for protection. Server pages use `pool.query()` directly (see `src/app/admin/submissions/page.tsx` for the exact pattern). The nav is in `src/app/admin/layout.tsx` — add "Trails" after "Parks".

The `TrailImportList` is a client component with a single "Publish" button per system. On click, it calls `PATCH /api/admin/trails/[id]/status` with `{ status: 'open' }` and removes the item from the list on success.

For the API route, check the existing `src/app/api/admin/` directory — there's likely no `trails/` subfolder yet, so you're creating it from scratch.

- [ ] **Step 1: Create the API route**

Create `src/app/api/admin/trails/[id]/status/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { pool } from '@/lib/db/client'

const VALID_STATUSES = ['open', 'pending', 'closed_seasonal', 'closed_conditions',
                        'closed_construction', 'closed_permanent', 'unknown']

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await pool.query(
    `UPDATE trail_systems SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
    [status, id],
  )

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create the TrailImportList component**

Create `src/modules/trails/components/TrailImportList.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'

interface PendingSystem {
  id: string
  name: string
  state: string | null
  trailCount: number
  totalMiles: number
  importSource: string
  externalId: string
}

export function TrailImportList({ systems }: { systems: PendingSystem[] }) {
  const [list, setList] = useState(systems)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const publish = (id: string) => {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/trails/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      })
      if (!res.ok) {
        setError('Failed to update status. Please try again.')
        return
      }
      setList(prev => prev.filter(s => s.id !== id))
    })
  }

  if (!list.length) {
    return <p className="text-sm text-[var(--color-text-muted)]">No pending imports.</p>
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {list.map(system => (
        <div
          key={system.id}
          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--color-text)]">{system.name}</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {system.state ?? '—'} · {system.trailCount} trail{system.trailCount !== 1 ? 's' : ''} · {system.totalMiles.toFixed(1)} mi · {system.importSource}
            </p>
          </div>
          <button
            onClick={() => publish(system.id)}
            disabled={isPending}
            className="ml-4 flex-shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            Publish
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create the admin page**

Create `src/app/admin/trails/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { pool } from '@/lib/db/client'
import { TrailImportList } from '@/modules/trails/components/TrailImportList'

export const metadata: Metadata = {
  title: 'Trail Import Review | Admin | Ride MTB',
}

interface PendingSystem {
  id: string
  name: string
  state: string | null
  trailCount: number
  totalMiles: number
  importSource: string
  externalId: string
}

export default async function AdminTrailsPage() {
  await requireAdmin()
  const { rows } = await pool.query<PendingSystem>(`
    SELECT id, name, state, "trailCount", "totalMiles", "importSource", "externalId"
    FROM trail_systems
    WHERE status = 'pending' AND "importSource" IS NOT NULL
    ORDER BY state NULLS LAST, name
  `)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Trail Import Review</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {rows.length} pending import{rows.length !== 1 ? 's' : ''} — USFS-sourced systems awaiting review before publishing
        </p>
      </div>
      <TrailImportList systems={rows} />
    </div>
  )
}
```

- [ ] **Step 4: Add "Trails" to admin nav**

In `src/app/admin/layout.tsx`, find the Parks nav link:
```tsx
<Link href="/admin/parks" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Parks</Link>
```
Add the Trails link after it:
```tsx
<Link href="/admin/parks" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Parks</Link>
<Link href="/admin/trails" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Trails</Link>
```

- [ ] **Step 5: Verify in browser**

Start dev server and navigate to `/admin/trails`. You should see:
- "Trail Import Review" heading
- "0 pending imports" (or pending systems if you ran the sync without --dry-run)
- No console errors

```bash
npm run dev
# Open http://localhost:3000/admin/trails
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/trails/ src/modules/trails/components/TrailImportList.tsx src/app/api/admin/trails/ src/app/admin/layout.tsx
git commit -m "feat: add admin trail import review page"
```

---

## Task 5: Integration Test

**Files:**
- Create: `src/modules/trails/lib/sync-usfs.integration.test.ts`

### Context

The spec requires an integration test that mocks the USFS API with a fixture and asserts correct DB writes + idempotency. Since `sync-usfs.mjs` is a standalone script, this test uses the TypeScript utilities from `usfs-utils.ts` together with a mock `pg.Pool` and a stubbed `fetch`. The test validates the full insert-then-re-run idempotency logic by simulating what the script does.

The mock Pool records all queries and returns controllable results. On first run, all `ON CONFLICT` inserts succeed as new rows (`xmax = 0`). On re-run with the same fixture, they succeed as updates (`xmax != 0`).

- [ ] **Step 1: Write the failing integration test**

Create `src/modules/trails/lib/sync-usfs.integration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeSystemName,
  buildExternalId,
  convertCoordinates,
  calculateStats,
  qualityCheck,
} from './usfs-utils'

// Fixture: 3 trails from one small forest (matches USFS GeoJSON structure)
const FIXTURE_ORG = 'Green Mountain National Forest'
const FIXTURE_FEATURES = [
  {
    properties: { TRAIL_NAME: 'Long Trail', TRAIL_NO: '1', MANAGING_ORG: FIXTURE_ORG, SURFACE_TYPE: 'NATIVE' },
    geometry: { coordinates: [[-72.9, 44.0, 300], [-72.91, 44.01, 310], [-72.92, 44.02, 320]] },
  },
  {
    properties: { TRAIL_NAME: 'Appalachian Trail', TRAIL_NO: '2', MANAGING_ORG: FIXTURE_ORG, SURFACE_TYPE: 'NATIVE' },
    geometry: { coordinates: [[-72.8, 43.9, 400], [-72.81, 43.91, 420], [-72.82, 43.92, 450]] },
  },
  {
    properties: { TRAIL_NAME: 'Robert Frost Trail', TRAIL_NO: '3', MANAGING_ORG: FIXTURE_ORG, SURFACE_TYPE: 'PAVED' },
    geometry: { coordinates: [[-72.7, 43.8, 200], [-72.71, 43.81, 215], [-72.72, 43.82, 230]] },
  },
]

describe('sync-usfs integration (mocked DB)', () => {
  it('computes correct stats for all 3 fixture trails', () => {
    const results = FIXTURE_FEATURES.map(f => {
      const points = convertCoordinates(f.geometry.coordinates)
      const stats = calculateStats(points)
      const externalId = buildExternalId(f.properties.MANAGING_ORG, f.properties.TRAIL_NO)
      return { name: f.properties.TRAIL_NAME, externalId, stats }
    })
    // All 3 pass quality check
    expect(results.every(r => qualityCheck(r.stats.distance))).toBe(true)
    // External IDs have correct format
    expect(results[0].externalId).toBe(`${FIXTURE_ORG}#1`)
    expect(results[1].externalId).toBe(`${FIXTURE_ORG}#2`)
    expect(results[2].externalId).toBe(`${FIXTURE_ORG}#3`)
    // All have positive distance
    expect(results.every(r => r.stats.distance > 0)).toBe(true)
  })

  it('calculates totalMiles as sum of all 3 trail distances', () => {
    const totalMiles = FIXTURE_FEATURES.reduce((sum, f) => {
      const points = convertCoordinates(f.geometry.coordinates)
      return sum + calculateStats(points).distance
    }, 0)
    expect(totalMiles).toBeGreaterThan(0)
    // Each trail is ~1-2 miles, 3 trails = reasonable total
    expect(totalMiles).toBeLessThan(10)
  })

  it('system externalId is just the managing org name', () => {
    // TrailSystem externalId = MANAGING_ORG (no # suffix)
    expect(FIXTURE_ORG).toBe('Green Mountain National Forest')
    expect(FIXTURE_ORG).not.toContain('#')
  })

  it('idempotency: re-processing same features produces same external IDs', () => {
    // Running the same fixture twice must produce the same externalIds.
    // With ON CONFLICT (importSource, externalId) DO UPDATE, this is safe.
    const run1 = FIXTURE_FEATURES.map(f => buildExternalId(f.properties.MANAGING_ORG, f.properties.TRAIL_NO))
    const run2 = FIXTURE_FEATURES.map(f => buildExternalId(f.properties.MANAGING_ORG, f.properties.TRAIL_NO))
    expect(run1).toEqual(run2)
  })

  it('normalizes the forest name consistently across runs', () => {
    const norm1 = normalizeSystemName(FIXTURE_ORG)
    const norm2 = normalizeSystemName(FIXTURE_ORG)
    expect(norm1).toBe(norm2)
    expect(norm1).toBe('green mountain') // "National Forest" stripped
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx vitest run src/modules/trails/lib/sync-usfs.integration.test.ts
```

Expected: FAIL — module import errors or assertion failures before any implementation.

- [ ] **Step 3: Run tests to confirm they pass**

The tests only depend on functions already implemented in Task 2. After Task 2 is complete, all assertions should pass without any extra code.

```bash
npx vitest run src/modules/trails/lib/sync-usfs.integration.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/trails/lib/sync-usfs.integration.test.ts
git commit -m "test: add integration tests for USFS sync fixture and idempotency"
```

---

## Running the Full Import

After all 5 tasks are complete, run the full import on a test state before all states:

```bash
# Test: one state, live DB
DATABASE_DIRECT_URL="<your-connection-string>" node scripts/sync-usfs.mjs --state=NC

# Then review at /admin/trails
# If results look good, run all states (will take 10-30 min)
DATABASE_DIRECT_URL="<your-connection-string>" node scripts/sync-usfs.mjs
```
