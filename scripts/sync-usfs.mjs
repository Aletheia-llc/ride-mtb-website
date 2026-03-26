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
  'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0/query'
const IMPORT_SOURCE = 'USFS'
const PAGE_SIZE = 2000
const MIN_DISTANCE_MILES = 0.05
const GEO_PROXIMITY_MILES = 50
const EARTH_RADIUS_MILES = 3959
const METERS_TO_FEET = 3.28084
const ELEVATION_NOISE_FT = 3

// ── State bounding boxes ──────────────────────────────────────────────────────

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
  const safeOrg = managingOrg.replace(/#/g, '-')
  return `${safeOrg}#${trailNo}`
}

function buildSlug(name, suffix) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/-$/, '')
  const safeSuffix = suffix.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40)
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
  const firstEleFt = (points[0][2] ?? 0) * METERS_TO_FEET
  let highPoint = firstEleFt, lowPoint = firstEleFt
  let minLat = points[0][0], maxLat = points[0][0]
  let minLng = points[0][1], maxLng = points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [lat1, lng1] = points[i - 1]
    const [lat2, lng2, ele2] = points[i]
    distance += haversineDistance(lat1, lng1, lat2, lng2)
    const ele1Ft = (points[i - 1][2] ?? 0) * METERS_TO_FEET
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
    outFields: 'TRAIL_NAME,TRAIL_NO,MANAGING_ORG,ALLOWED_TERRA_USE,TRAIL_SURFACE,GIS_MILES',
    inSR: '4326',
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
      try {

      // Centroid: average midpoint of each segment
      const centers = forestFeatures.flatMap(f => {
        const coords = f.geometry?.coordinates
        if (!coords?.length) return []
        const mid = Math.floor(coords.length / 2)
        return [[coords[mid][1], coords[mid][0], 0]] // [lat, lng, 0]
      })
      const centroid = calculateCentroid(centers)

      if (/^\d+$/.test(managingOrg)) {
        console.warn(`  ⚠ "${managingOrg}" is a numeric org code — system name will need manual cleanup`)
      }

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

      // Process trail segments
      let systemMiles = 0, systemTrailCount = 0

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
          const trailSlug = buildSlug(trailName, String(trailNo))
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
              props.TRAIL_SURFACE ?? null,
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

      } catch (err) {
        console.error(`  ✗ Error processing "${managingOrg}": ${err.message}`)
        summary.segmentsSkipped += forestFeatures.length
        continue
      }
    }
  }

  await pool.end()

  console.log('\n── Summary ─────────────────────────────────')
  console.log(`States processed:            ${summary.statesProcessed}`)
  console.log(`National Forests found:      ${summary.forestsFound}`)
  console.log(`Existing systems enriched:   ${summary.systemsEnriched}`)
  console.log(`New pending systems created: ${summary.systemsCreated}`)
  console.log(`Trails added:                ${summary.trailsAdded}`)
  console.log(`Trails updated (geometry):   ${summary.trailsUpdated}`)
  console.log(`Segments skipped:            ${summary.segmentsSkipped}`)
}

main().catch(err => {
  console.error('Sync failed:', err)
  process.exit(1)
})
