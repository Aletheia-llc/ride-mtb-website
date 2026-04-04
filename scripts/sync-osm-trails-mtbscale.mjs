// Import MTB trails from OSM using international mtb:scale tag
// Queries each state's bounding box individually to avoid Overpass size limits
// (US-wide bbox for way[mtb:scale][name] returns HTTP 400 — too many results)
// Safe to re-run — uses ON CONFLICT DO NOTHING on externalId
//
// Usage: node scripts/sync-osm-trails-mtbscale.mjs

import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const TIMEOUT_MS = 90_000

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
]

// State bounding boxes: [south, west, north, east]
const STATE_BBOXES = [
  ['Alabama',          30.14, -88.47,  35.01,  -84.89],
  ['Alaska',           51.23, -179.15, 71.35, -129.97],
  ['Arizona',          31.33, -114.82, 37.00, -109.04],
  ['Arkansas',         33.00,  -94.62, 36.50,  -89.64],
  ['California',       32.53, -124.41, 42.01, -114.13],
  ['Colorado',         36.99, -109.06, 41.00, -102.04],
  ['Connecticut',      40.98,  -73.73, 42.05,  -71.79],
  ['Delaware',         38.45,  -75.79, 39.84,  -75.05],
  ['Florida',          24.52,  -87.63, 31.00,  -80.03],
  ['Georgia',          30.36,  -85.61, 35.00,  -80.84],
  ['Hawaii',           18.91, -160.25, 22.24, -154.81],
  ['Idaho',            41.99, -117.24, 49.00, -111.04],
  ['Illinois',         36.97,  -91.51, 42.51,  -87.02],
  ['Indiana',          37.77,  -88.10, 41.76,  -84.78],
  ['Iowa',             40.38,  -96.64, 43.50,  -90.14],
  ['Kansas',           36.99, -102.05, 40.00,  -94.59],
  ['Kentucky',         36.50,  -89.57, 39.15,  -81.96],
  ['Louisiana',        28.93,  -94.04, 33.02,  -88.82],
  ['Maine',            42.98,  -71.08, 47.46,  -66.95],
  ['Maryland',         37.91,  -79.49, 39.72,  -74.99],
  ['Massachusetts',    41.24,  -73.50, 42.89,  -69.93],
  ['Michigan',         41.70,  -90.42, 48.18,  -82.41],
  ['Minnesota',        43.50,  -97.24, 49.38,  -89.53],
  ['Mississippi',      30.17,  -91.65, 35.01,  -88.10],
  ['Missouri',         35.99,  -95.77, 40.61,  -89.10],
  ['Montana',          44.36, -116.05, 49.00, -104.04],
  ['Nebraska',         39.99, -104.05, 43.00,  -95.31],
  ['Nevada',           35.00, -120.01, 42.00, -114.03],
  ['New Hampshire',    42.70,  -72.56, 45.31,  -70.61],
  ['New Jersey',       38.93,  -75.56, 41.36,  -73.89],
  ['New Mexico',       31.33, -109.05, 37.00, -103.00],
  ['New York',         40.50,  -79.76, 45.02,  -71.86],
  ['North Carolina',   33.84,  -84.32, 36.59,  -75.46],
  ['North Dakota',     45.94, -104.05, 49.00,  -96.55],
  ['Ohio',             38.40,  -84.82, 42.33,  -80.52],
  ['Oklahoma',         33.62, -103.00, 37.00,  -94.43],
  ['Oregon',           41.99, -124.57, 46.24, -116.46],
  ['Pennsylvania',     39.72,  -80.52, 42.27,  -74.70],
  ['Rhode Island',     41.15,  -71.91, 42.02,  -71.13],
  ['South Carolina',   32.05,  -83.35, 35.21,  -78.54],
  ['South Dakota',     42.48, -104.06, 45.94,  -96.44],
  ['Tennessee',        34.98,  -90.31, 36.68,  -81.65],
  ['Texas',            25.84, -106.65, 36.50,  -93.51],
  ['Utah',             36.99, -114.05, 42.00, -109.04],
  ['Vermont',          42.73,  -73.44, 45.02,  -71.50],
  ['Virginia',         36.54,  -83.68, 39.47,  -75.23],
  ['Washington',       45.54, -124.73, 49.00, -116.92],
  ['West Virginia',    37.20,  -82.64, 40.64,  -77.72],
  ['Wisconsin',        42.49,  -92.89, 47.08,  -86.22],
  ['Wyoming',          40.99, -111.06, 45.01, -104.05],
]

// OSM mtb:scale (0–6) → our physicalDifficulty (1–5)
function osmScaleToInt(scale) {
  const n = parseInt(scale)
  if (isNaN(n)) return null
  if (n <= 0) return 1
  if (n === 1) return 2
  if (n === 2) return 3
  if (n === 3) return 4
  return 5
}

function buildSlug(name, externalId) {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 55).replace(/-$/, '')
  return `${base}-${externalId.replace(':', '-')}`
}

function getCenter(element) {
  if (element.center) return element.center
  if (element.lat != null) return { lat: element.lat, lon: element.lon }
  return null
}

async function runOverpassQuery(query, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const url = OVERPASS_URLS[attempt % OVERPASS_URLS.length]
    if (attempt > 0) {
      const wait = attempt * 20_000
      process.stdout.write(`\n  Retry via ${url} (${wait / 1000}s)...`)
      await new Promise(r => setTimeout(r, wait))
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      const text = await res.text().catch(() => '')
      if (!res.ok || text.startsWith('<')) {
        if (attempt < retries - 1) continue
        return []
      }
      const json = JSON.parse(text)
      return json.elements ?? []
    } catch (_) {
      if (attempt < retries - 1) continue
      return []
    } finally {
      clearTimeout(timer)
    }
  }
  return []
}

function getTrailType(tags) {
  const scale = parseInt(tags['mtb:scale'] ?? '0')
  if (tags['mtb:type'] === 'jump' || tags.sport === 'bmx') return 'freeride'
  if (scale >= 4) return 'downhill'
  if (tags.incline || tags.climb) return 'climbing'
  return 'xc'
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  // Load all systems for proximity matching
  const { rows: allSystems } = await pool.query(`
    SELECT id, latitude, longitude FROM trail_systems
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `)
  console.log(`Loaded ${allSystems.length} systems for proximity matching`)
  console.log(`Querying ${STATE_BBOXES.length} states for way[mtb:scale] trails...\n`)

  function findNearestSystem(lat, lon, maxKm = 20) {
    let best = null, bestDist = Infinity
    for (const sys of allSystems) {
      const dlat = lat - sys.latitude
      const dlon = lon - sys.longitude
      const dist = Math.sqrt(dlat * dlat + dlon * dlon) * 111
      if (dist < bestDist) { bestDist = dist; best = sys }
    }
    return bestDist <= maxKm ? best : null
  }

  let totalInserted = 0, totalSkipped = 0

  for (let i = 0; i < STATE_BBOXES.length; i++) {
    const [stateName, south, west, north, east] = STATE_BBOXES[i]
    process.stdout.write(`\r[${i + 1}/${STATE_BBOXES.length}] ${stateName.padEnd(20)} inserted:${totalInserted} skipped:${totalSkipped}  `)

    const bbox = `${south},${west},${north},${east}`
    const query = `[out:json][timeout:60];(
      way["mtb:scale"][name](${bbox});
    );out center tags;`

    const ways = await runOverpassQuery(query)

    for (const el of ways) {
      const tags = el.tags ?? {}
      const name = tags.name ?? ''
      if (!name) { totalSkipped++; continue }

      const center = getCenter(el)
      if (!center) { totalSkipped++; continue }

      const system = findNearestSystem(center.lat, center.lon)
      if (!system) { totalSkipped++; continue }

      const externalId = `osm-w${el.id}`
      const slug = buildSlug(name, externalId)
      const difficulty = osmScaleToInt(tags['mtb:scale']) ?? 2
      const trailType = getTrailType(tags)

      try {
        const result = await pool.query(`
          INSERT INTO trails (
            id, "trailSystemId", name, slug, "trailType",
            "physicalDifficulty", "technicalDifficulty",
            status, "hasGpsTrack", "gpsContributionCount",
            "reviewCount", "rideCount", "externalId", "importSource",
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4,
            $5, $5,
            'open', false, 0,
            0, 0, $6, 'osm',
            NOW(), NOW()
          )
          ON CONFLICT ("externalId") DO NOTHING
          RETURNING id
        `, [system.id, name, slug, trailType, difficulty, externalId])
        if (result.rows.length > 0) totalInserted++
        else totalSkipped++ // already existed
      } catch (err) {
        totalSkipped++
      }
    }

    // 3s pause between states to be polite to Overpass
    await new Promise(r => setTimeout(r, 3000))
  }

  // Update trail counts on all systems
  console.log('\n\nUpdating trail counts...')
  await pool.query(`
    UPDATE trail_systems ts
    SET "trailCount" = (
      SELECT COUNT(*) FROM trails t WHERE t."trailSystemId" = ts.id
    ),
    "updatedAt" = NOW()
  `)

  const { rows: stats } = await pool.query(`
    SELECT COUNT(*) FROM trails WHERE "importSource" = 'osm'
  `)
  console.log(`\nDone!`)
  console.log(`  Inserted (new): ${totalInserted}`)
  console.log(`  Skipped:        ${totalSkipped}`)
  console.log(`  Total OSM trails in DB: ${stats[0].count}`)

  await pool.end()
}

main().catch(err => { console.error('Failed:', err); process.exit(1) })
