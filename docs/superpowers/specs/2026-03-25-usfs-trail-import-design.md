# USFS Trail Import Design

**Goal:** Import US National Forest System (USFS) trail data into the Ride MTB trail database — enriching existing trail systems with better GPS geometry and creating net-new `pending` trail systems for National Forests not yet represented.

**Architecture:** A standalone sync script (`scripts/sync-usfs.mjs`) following the `sync-parks.mjs` pattern. Fetches GeoJSON directly from the USFS public ArcGIS REST API (no shapefile parsing, no auth). Queries per state for free state attribution. Matches USFS National Forests to existing TrailSystems using fuzzy name + geographic proximity, then upserts Trail + TrailGpsTrack records. New systems land as `status: pending` for admin review before publishing. Safe to re-run — all upserts keyed on `importSource` + `externalId` (reusing existing fields; no new schema fields added for Trail or TrailSystem). Coordinate stats (distance, elevation) are calculated inline in the script — no TypeScript imports.

**Tech stack:** Node.js (ESM), direct Postgres via `pg` (same as sync-parks.mjs), stats logic ported inline from `gpx-processor.ts`, Prisma migration for schema additions to TrailGpsTrack only.

**Out of scope (follow-up):** BLM trail data — same script architecture, different API endpoint. Deferred until USFS is stable and validated.

---

## Data Source

**USFS National Forest System Trails — ArcGIS REST Feature Service**

- URL: `https://services1.arcgis.com/SHG9FMbq00oBSN3m/arcgis/rest/services/National_Forest_System_Trails_6_8_22/FeatureServer/0/query`
- Public, no authentication required
- Returns GeoJSON natively (`f=geojson` param)
- ~157,000 trail segments covering all US National Forests
- Paginated: 2,000 features per request, loop with `resultOffset`

**Query parameters used:**
- `where=TRAIL_TYPE='TERRA'` — excludes snow trails (snowmobile, ski)
- `geometry={minX},{minY},{maxX},{maxY}` — state bounding box
- `geometryType=esriGeometryEnvelope`
- `spatialRel=esriSpatialRelIntersects`
- `outFields=TRAIL_NAME,TRAIL_NO,MANAGING_ORG,ALLOWED_TERRA_USE,SURFACE_TYPE,GIS_MILES`
- `outSR=4326` — WGS84 coordinates
- `f=geojson`
- `resultOffset=N&resultRecordCount=2000`

**Key fields:**
| Field | Description | Usage |
|-------|-------------|-------|
| `TRAIL_NAME` | Trail name (Title Case) | Trail.name |
| `TRAIL_NO` | Trail number within forest | Part of externalId |
| `MANAGING_ORG` | National Forest name | Groups trails → TrailSystem |
| `ALLOWED_TERRA_USE` | Comma-separated use codes | Filter/tag (includes "MOUNTAIN BIKE") |
| `SURFACE_TYPE` | Trail surface | Trail.surfaceType |
| `GIS_MILES` | USFS-reported length | Validation cross-check |
| geometry | GeoJSON LineString | TrailGpsTrack.trackData |

---

## Schema Changes

Only `TrailGpsTrack` needs new fields. `Trail` and `TrailSystem` already have `importSource String?` and `externalId String?` — the script reuses them. The only new additions are:

1. **`TrailGpsTrack`** — add `importSource` and `externalId` fields (so GPS tracks can be upserted independently if needed, though the primary upsert key is the existing `trailId @unique`)
2. **Compound unique indexes** — add `@@unique([importSource, externalId])` to `Trail` and `TrailSystem` to enable `ON CONFLICT` SQL upserts. TrailGpsTrack already has `trailId @unique`, so it uses that for upserts.

```prisma
model TrailGpsTrack {
  // ... existing fields unchanged ...
  importSource  String?   // e.g. "USFS"
  externalId    String?   // e.g. "Pisgah National Forest#2108"
}

model Trail {
  // ... existing fields unchanged (importSource and externalId already exist) ...
  // Migration adds: @@unique([importSource, externalId])
}

model TrailSystem {
  // ... existing fields unchanged (importSource and externalId already exist) ...
  // Migration adds: @@unique([importSource, externalId])
}
```

**`externalId` format:** `"{MANAGING_ORG}#{TRAIL_NO}"` for trails/GPS tracks (e.g., `"Pisgah National Forest#2108"`), `"{MANAGING_ORG}"` for systems (e.g., `"Pisgah National Forest"`). `importSource = "USFS"` for all records from this script.

**Upsert keys:**
- TrailSystem: `ON CONFLICT (importSource, externalId) DO UPDATE` (requires new `@@unique`)
- Trail: `ON CONFLICT (importSource, externalId) DO UPDATE` (requires new `@@unique`)
- TrailGpsTrack: `ON CONFLICT (trailId) DO UPDATE` (existing `@unique`)

---

## Matching Algorithm

Two levels: system-level first, then trail-level within a matched system.

### System-level matching

For each USFS National Forest (grouped by `MANAGING_ORG`):

1. **Calculate centroid** — average lat/lng across all trail segment centers in the group.

2. **Name fuzzy-match** — normalize both sides:
   - Lowercase
   - Strip "national forest", "NF", "national", punctuation, extra whitespace
   - Check if normalized USFS name is a substring of any existing `TrailSystem.name` (normalized), or vice-versa

3. **Geo proximity match** — check if centroid falls within 50 miles of any existing `TrailSystem.(latitude, longitude)`.

4. **Decision:**

| Name match | Geo match | Action |
|-----------|-----------|--------|
| ✓ | ✓ | Enrich existing system (highest confidence — logged) |
| ✓ | ✗ | Enrich existing system (name is specific enough) |
| ✗ | ✓ | Create new pending system (geo alone too ambiguous) |
| ✗ | ✗ | Create new pending system |

### Trail-level matching (within an enriched system)

For each USFS trail segment in a forest that matched an existing system:

1. Normalize both USFS `TRAIL_NAME` and existing `Trail.name` (lowercase, strip "trail", punctuation)
2. If normalized names match → update/create `TrailGpsTrack` for that trail
3. If no name match → create new `Trail` (status: pending) + `TrailGpsTrack`

---

## Script Pipeline: `scripts/sync-usfs.mjs`

The script is **safe to re-run** — all DB writes use `ON CONFLICT ... DO UPDATE`. Running it twice produces the same result as running it once.

The script is pure ESM (`.mjs`) and does **not** import any TypeScript source files. All coordinate stats logic (distance, elevation gain/loss, high point, low point) is ported inline from `src/modules/trails/lib/gpx-processor.ts`.

```
INPUTS:
  - Optional --state=XX flag to sync a single state (default: all states)
  - Optional --dry-run flag to log actions without writing to DB

FOR EACH state in STATE_BBOXES:
  1. Fetch USFS trails (paginated until exhausted)
     Filter: TRAIL_TYPE = 'TERRA'
     Geometry: state bounding box

  2. Group by MANAGING_ORG → one group per National Forest

  FOR EACH National Forest group:
    3. Calculate centroid of all trail centers in group
    4. Run system matching algorithm
    5. Upsert TrailSystem:
       - Match: update totalMiles + trailCount
       - No match: INSERT with status=pending, lat/lng=centroid, state=current state,
                   importSource='USFS', externalId='{MANAGING_ORG}'

    FOR EACH trail segment in group:
      6. Extract geometry: GeoJSON LineString [lng, lat, ele?] → [lat, lng, ele][]]
         (Note: GeoJSON is [lng, lat], trackData is [lat, lng] — must swap)
      7. Calculate stats inline (ported from gpx-processor.ts):
         distance, elevationGain, elevationLoss, highPoint, lowPoint, bounds
      8. Quality check: skip if distance < 0.05 miles (indicates bad/stub geometry)
      9. Upsert Trail by (importSource, externalId)
         - status: pending if new trail in matched system, open if system already open
         - surfaceType from SURFACE_TYPE field
         - hasGpsTrack: true
         - importSource: 'USFS'
         - externalId: '{MANAGING_ORG}#{TRAIL_NO}'
     10. Upsert TrailGpsTrack by trailId
         - importSource: 'USFS'
         - externalId: '{MANAGING_ORG}#{TRAIL_NO}'
         - trackData: JSON stringified [lat, lng, ele][]
         - bounds fields
         - pointCount

  11. Update TrailSystem.totalMiles and TrailSystem.trailCount

PRINT SUMMARY:
  "States processed: N"
  "National Forests found: N"
  "Existing systems enriched: N"
  "New pending systems created: N"
  "Trails added: N"
  "Trails updated (geometry): N"
  "Segments skipped (bad geometry): N"
```

---

## State Bounding Boxes

The script includes a `STATE_BBOXES` map — one bounding box per state (same keys as the existing `STATE_SLUG_MAP` in `src/modules/parks/lib/overpass.ts`). This gives each imported trail a `state` value without needing reverse geocoding.

Format: `{ AL: { minX: -88.47, minY: 30.22, maxX: -84.89, maxY: 35.01 }, ... }`

---

## Admin Review Workflow

New USFS-sourced TrailSystems land with `status: pending` and `importSource = 'USFS'`. They are not visible to regular users (only `status: open` systems are shown on public pages).

Since there is no existing trail management section in `/admin`, a new minimal admin page is required:

**`/admin/trails`** — New page with:
1. Filter: "Pending Import" — shows `status = pending AND importSource IS NOT NULL`
2. List view: name, state, trailCount, totalMiles, importSource, externalId
3. Per-item actions: edit name, add description, toggle status (pending → open)

This is a small addition (~1 page + 1 API route) with no complex UI required.

---

## Testing

### Unit tests (Vitest) — pure functions extracted from the script

| Function | Test cases |
|----------|-----------|
| `normalizeSystemName(name)` | `"Pisgah National Forest"` → `"pisgah"`, `"Chattahoochee-Oconee NF"` → `"chattahoochee oconee"`, handles null |
| `convertCoordinates(geojsonCoords)` | `[[lng, lat, ele], ...]` → `[[lat, lng, ele], ...]`, handles missing elevation |
| `calculateCentroid(points)` | Returns average lat/lng, handles single-point case |
| `qualityCheck(distanceMiles)` | Returns false for `< 0.05`, true for `>= 0.05` |
| `buildExternalId(managingOrg, trailNo)` | Returns `"Pisgah National Forest#2108"` |

### Integration test (Vitest)

Mock the USFS API response with a fixture of 3 trails from one small forest. Assert:
- 1 TrailSystem created with `status: pending` and correct `importSource`/`externalId`
- 3 Trail records created with correct `importSource`/`externalId`
- 3 TrailGpsTrack records with `importSource: 'USFS'`
- TrailSystem `totalMiles` = sum of the 3 trail distances
- Re-running the mock produces same counts (idempotent)

### Manual smoke test

```bash
node scripts/sync-usfs.mjs --state=CO --dry-run
```

Review logged output (systems found, match decisions, trail counts) before running without `--dry-run`.
