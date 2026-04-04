// Import singletrack trails from OSM — catches city parks like Bidwell Park in Chico, CA
// that have real MTB trails but no mtb:scale tag or route=mtb relation.
//
// Queries per state: highway=singletrack, highway=path[bicycle=designated/mountain_biking=designated]
// When no trail system exists within 20km, auto-creates one from the nearest leisure=park.
// Safe to re-run — externalId ON CONFLICT DO NOTHING (same osm-w{id} format as other scripts).
//
// Usage: node scripts/sync-osm-singletrack.mjs
// Optional: node scripts/sync-osm-singletrack.mjs California   (single state for testing)

import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const TIMEOUT_MS = 300_000 // 5 min — needed for large states like CA/TX

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

const STATE_ABBR_MAP = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN',
  Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
}

function osmScaleToInt(scale) {
  const n = parseInt(scale)
  if (isNaN(n)) return null
  if (n <= 0) return 1
  if (n === 1) return 2
  if (n === 2) return 3
  if (n === 3) return 4
  return 5
}

function getDifficulty(tags) {
  // Try mtb:scale first, then generic difficulty tag
  const mtb = osmScaleToInt(tags['mtb:scale'])
  if (mtb) return mtb
  const d = tags['difficulty'] ?? tags['sac_scale']
  if (!d) return 2
  const lower = d.toLowerCase()
  if (lower.includes('easy') || lower === 'hiking') return 2
  if (lower.includes('moderate') || lower === 'mountain_hiking') return 3
  if (lower.includes('hard') || lower.includes('difficult') || lower === 'demanding_mountain_hiking') return 4
  if (lower.includes('expert') || lower.includes('extreme') || lower === 'alpine_hiking') return 5
  return 2
}

function getTrailType(tags) {
  const scale = parseInt(tags['mtb:scale'] ?? '0')
  if (tags['mtb:type'] === 'jump' || tags.sport === 'bmx') return 'freeride'
  if (scale >= 4) return 'downhill'
  if (tags.incline || tags.climb) return 'climbing'
  return 'xc'
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

// Fetch all named parks in a state bounding box in one query
async function fetchParksInBbox(bbox) {
  const query = `[out:json][timeout:60];(
    node[leisure=park][name](${bbox});
    way[leisure=park][name](${bbox});
    relation[leisure=park][name](${bbox});
    node[leisure=nature_reserve][name](${bbox});
    relation[leisure=nature_reserve][name](${bbox});
  );out center tags;`
  const elements = await runOverpassQuery(query)
  return elements
    .map(el => ({ el, center: getCenter(el), name: el.tags?.name }))
    .filter(c => c.center && c.name)
}

async function main() {
  const targetState = process.argv[2] ?? null
  const bboxes = targetState
    ? STATE_BBOXES.filter(([name]) => name.toLowerCase() === targetState.toLowerCase())
    : STATE_BBOXES

  if (targetState && bboxes.length === 0) {
    console.error(`Unknown state: "${targetState}"`)
    process.exit(1)
  }

  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  // Load all existing systems for proximity matching
  const { rows: allSystems } = await pool.query(`
    SELECT id, name, latitude, longitude FROM trail_systems
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `)
  console.log(`Loaded ${allSystems.length} existing systems for proximity matching`)
  console.log(`Querying ${bboxes.length} state(s) for singletrack trails...\n`)

  function findNearest(list, lat, lon, maxKm) {
    let best = null, bestDist = Infinity
    for (const item of list) {
      const dlat = lat - item.lat
      const dlon = lon - item.lon
      const dist = Math.sqrt(dlat * dlat + dlon * dlon) * 111
      if (dist < bestDist) { bestDist = dist; best = item }
    }
    return bestDist <= maxKm ? best : null
  }

  function findNearestSystem(lat, lon) {
    return findNearest(allSystems.map(s => ({ ...s, lat: s.latitude, lon: s.longitude })), lat, lon, 20)
  }

  let totalInserted = 0, totalSkipped = 0, systemsCreated = 0

  for (let i = 0; i < bboxes.length; i++) {
    const [stateName, south, west, north, east] = bboxes[i]
    const stateAbbr = STATE_ABBR_MAP[stateName] ?? null
    const bbox = `${south},${west},${north},${east}`

    process.stdout.write(`\r[${i + 1}/${bboxes.length}] ${stateName.padEnd(20)} fetching trails...                   `)

    // Query 1: fetch all named singletrack ways
    // bicycle=yes catches city park trails like Bidwell Park that use permissive access rather than designated
    const trailQuery = `[out:json][timeout:120];(
      way[highway=singletrack][name](${bbox});
      way[highway=path][bicycle=designated][name](${bbox});
      way[highway=path][mountain_biking=designated][name](${bbox});
      way[highway=path][bicycle=yes][name](${bbox});
    );out center tags;`
    const ways = await runOverpassQuery(trailQuery)

    process.stdout.write(`\r[${i + 1}/${bboxes.length}] ${stateName.padEnd(20)} ${ways.length} trails found, fetching parks...  `)

    // Query 2: fetch all named parks in this state in one batch
    // Use [maxsize:1073741824] for large states (CA, TX, etc.) to avoid truncation
    const parkQuery = `[out:json][timeout:180][maxsize:1073741824];(
      node[leisure=park][name](${bbox});
      way[leisure=park][name](${bbox});
      relation[leisure=park][name](${bbox});
      node[leisure=nature_reserve][name](${bbox});
      relation[leisure=nature_reserve][name](${bbox});
    );out center tags;`
    const rawParks = await runOverpassQuery(parkQuery)
    const parks = rawParks
      .map(el => ({ el, lat: getCenter(el)?.lat, lon: getCenter(el)?.lon, name: el.tags?.name }))
      .filter(p => p.lat != null && p.name)

    process.stdout.write(`\r[${i + 1}/${bboxes.length}] ${stateName.padEnd(20)} ${ways.length} trails, ${parks.length} parks — inserting...  `)

    // Cache OSM park externalId → DB system (avoid re-querying DB for each trail)
    const parkSystemCache = new Map() // osmExternalId → DB system row

    for (const el of ways) {
      const tags = el.tags ?? {}
      const name = tags.name ?? ''
      if (!name) { totalSkipped++; continue }

      const center = getCenter(el)
      if (!center) { totalSkipped++; continue }

      const externalId = `osm-w${el.id}`

      // Try existing systems first (within 20km)
      let system = findNearestSystem(center.lat, center.lon)

      // Fall back: find nearest park from the batch we already fetched (within 10km)
      if (!system) {
        const nearestPark = findNearest(parks, center.lat, center.lon, 10)
        if (nearestPark) {
          const parkExternalId = `osm-${nearestPark.el.type[0]}${nearestPark.el.id}`

          if (parkSystemCache.has(parkExternalId)) {
            system = parkSystemCache.get(parkExternalId)
          } else {
            // Check DB then insert if new
            const existing = await pool.query(
              `SELECT id, name, latitude, longitude FROM trail_systems WHERE "externalId" = $1`,
              [parkExternalId]
            )
            if (existing.rows.length > 0) {
              system = existing.rows[0]
            } else {
              const slug = buildSlug(nearestPark.name, parkExternalId)
              try {
                const res = await pool.query(`
                  INSERT INTO trail_systems (
                    id, name, slug, city, state, country, latitude, longitude,
                    "systemType", status, "totalMiles", "trailCount", "dogFriendly",
                    "eMtbAllowed", "isFeatured", "passRequired", "reviewCount",
                    "rideCount", "totalVertFt", "externalId", "importSource",
                    "createdAt", "updatedAt"
                  ) VALUES (
                    gen_random_uuid(), $1, $2, NULL, $3, 'US', $4, $5,
                    'open_space', 'open', 0, 0, true,
                    true, false, false, 0,
                    0, 0, $6, 'osm',
                    NOW(), NOW()
                  )
                  ON CONFLICT ("externalId") DO UPDATE SET "updatedAt" = NOW()
                  RETURNING id, name, latitude, longitude
                `, [nearestPark.name, slug, stateAbbr, nearestPark.lat, nearestPark.lon, parkExternalId])
                system = res.rows[0]
                systemsCreated++
                // Add to allSystems so later states can find it too
                allSystems.push({ ...system, latitude: system.latitude, longitude: system.longitude })
              } catch (_) {
                totalSkipped++
                continue
              }
            }
            parkSystemCache.set(parkExternalId, system)
          }
        }
      }

      if (!system) { totalSkipped++; continue }

      const slug = buildSlug(name, externalId)
      const difficulty = getDifficulty(tags)
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
        else totalSkipped++
      } catch (_) {
        totalSkipped++
      }
    }

    process.stdout.write(`\r[${i + 1}/${bboxes.length}] ${stateName.padEnd(20)} inserted:${totalInserted} skipped:${totalSkipped} new_systems:${systemsCreated}  \n`)

    // 3s pause between states to be polite to Overpass
    if (i < bboxes.length - 1) await new Promise(r => setTimeout(r, 3000))
  }

  // Update trail counts on all affected systems
  console.log('\nUpdating trail counts...')
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
  console.log(`Done!`)
  console.log(`  Inserted (new): ${totalInserted}`)
  console.log(`  Skipped:        ${totalSkipped}`)
  console.log(`  Systems created: ${systemsCreated}`)
  console.log(`  Total OSM trails in DB: ${stats[0].count}`)

  await pool.end()
}

main().catch(err => { console.error('Failed:', err); process.exit(1) })
