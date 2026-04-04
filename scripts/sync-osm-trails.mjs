// Import MTB trail systems from OpenStreetMap
// Sources: named MTB route relations + MTB area relations
// Each named relation → one trail_system entry (map pin)
// Member ways → individual trail entries (no GPS tracks — those need manual GPX uploads)
//
// Usage: node scripts/sync-osm-trails.mjs
// Safe to re-run — uses ON CONFLICT DO NOTHING on externalId

import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const US_BBOX = '24.396308,-124.848974,49.384358,-66.885444'
const TIMEOUT_MS = 180_000

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
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
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
}

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

// IMBA scale (0=white, 1=green, 2=blue, 3=black, 4=double-black) → physicalDifficulty (1–5)
function imbaScaleToInt(scale) {
  const n = parseInt(scale)
  if (isNaN(n)) return null
  if (n <= 0) return 1
  if (n === 1) return 2
  if (n === 2) return 3
  if (n === 3) return 4
  return 5
}

function getDifficulty(tags) {
  return osmScaleToInt(tags['mtb:scale']) ?? imbaScaleToInt(tags['mtb:scale:imba']) ?? 2
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

async function runOverpassQuery(query, label, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const url = OVERPASS_URLS[attempt % OVERPASS_URLS.length]
    if (attempt > 0) {
      const wait = attempt * 30_000
      console.log(`  Retry ${attempt}/${retries - 1} via ${url} (waiting ${wait / 1000}s)...`)
      await new Promise(r => setTimeout(r, wait))
    } else {
      console.log(`  Querying ${url}...`)
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
        console.warn(`  Got ${res.ok ? 'HTML error' : res.status} from ${url}`)
        if (attempt < retries - 1) continue
        throw new Error(`All endpoints failed`)
      }
      const json = JSON.parse(text)
      return json.elements ?? []
    } catch (err) {
      if (attempt < retries - 1) { console.warn(`  Error: ${err.message}`); continue }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}

// Determine trail system type from OSM tags
function getSystemType(tags) {
  if (tags.leisure === 'bikepark' || tags['mtb:type'] === 'bikepark') return 'bike_park'
  if (tags.leisure === 'park' || tags.leisure === 'nature_reserve') return 'open_space'
  if (tags.landuse === 'urban') return 'urban_park'
  return 'trail_network'
}

// Determine trail type from OSM tags
function getTrailType(tags) {
  const scale = parseInt(tags['mtb:scale'] ?? '0')
  if (tags['mtb:type'] === 'jump' || tags.sport === 'bmx') return 'freeride'
  if (scale >= 4) return 'downhill'
  if (tags.incline || tags.climb) return 'climbing'
  return 'xc'
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  // Ensure unique indexes exist so ON CONFLICT works
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS trail_systems_external_id_idx ON trail_systems("externalId")`)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS trails_external_id_idx ON trails("externalId")`)
  console.log('Indexes ready.')

  // Query 1: Trail systems — MTB route relations + bikepark nodes/relations
  console.log('\n[1/2] MTB Trail Systems (relations + bikepark nodes)')
  const relQuery = `[out:json][timeout:120];(
    relation[route=mtb][name](${US_BBOX});
    relation[sport=mountain_biking][name][type!=route](${US_BBOX});
    relation[leisure=bikepark][name](${US_BBOX});
    node[leisure=bikepark][name](${US_BBOX});
    relation[leisure=park][name][mountain_biking=yes](${US_BBOX});
    relation[leisure=park][name][mountain_biking=designated](${US_BBOX});
    relation[leisure=nature_reserve][name][mountain_biking=yes](${US_BBOX});
    relation[leisure=nature_reserve][name][mountain_biking=designated](${US_BBOX});
  );out center tags;`

  let relations = []
  try {
    relations = await runOverpassQuery(relQuery, 'MTB relations')
  } catch (err) {
    console.error('  Failed:', err.message)
  }
  console.log(`  Got ${relations.length} elements`)

  // Query 2: IMBA-rated trails (dominant US standard — mtb:scale:imba often exists without mtb:scale)
  console.log('\n[2/2] IMBA-Rated Trail Ways (mtb:scale:imba)')
  await new Promise(r => setTimeout(r, 3000))
  const imbaQuery = `[out:json][timeout:120];(
    way["mtb:scale:imba"][name](${US_BBOX});
    way[sport=mountain_biking][name](${US_BBOX});
  );out center tags;`

  let allWays = []
  try {
    allWays = await runOverpassQuery(imbaQuery, 'IMBA ways')
  } catch (err) {
    console.error('  Failed:', err.message)
  }
  console.log(`  Got ${allWays.length} ways`)

  // ─── Insert trail systems from relations ───────────────────────────────────
  console.log('\nInserting trail systems...')
  let systemsInserted = 0, systemsSkipped = 0

  // Build a lookup: osmId → system DB id (for linking trails)
  const osmIdToSystemId = new Map()

  for (const el of relations) {
    const tags = el.tags ?? {}
    const name = tags.name ?? tags['name:en'] ?? ''
    if (!name) { systemsSkipped++; continue }

    const center = getCenter(el)
    if (!center) { systemsSkipped++; continue }

    const externalId = `osm-r${el.id}`
    const slug = buildSlug(name, externalId)

    const stateRaw = tags['addr:state'] ?? tags.state ?? null
    const state = stateRaw ? (STATE_ABBR_MAP[stateRaw] ?? stateRaw.toUpperCase()) : null

    try {
      const result = await pool.query(`
        INSERT INTO trail_systems (
          id, name, slug, city, state, country, latitude, longitude,
          "systemType", status, "totalMiles", "trailCount", "dogFriendly",
          "eMtbAllowed", "isFeatured", "passRequired", "reviewCount",
          "rideCount", "totalVertFt", "externalId", "importSource",
          "websiteUrl", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 'US', $5, $6,
          $7, 'open', 0, 0, true,
          true, false, false, 0,
          0, 0, $8, 'osm',
          $9, NOW(), NOW()
        )
        ON CONFLICT ("externalId") DO NOTHING
        RETURNING id
      `, [
        name, slug,
        tags['addr:city'] ?? null, state,
        center.lat, center.lon,
        getSystemType(tags),
        externalId,
        tags.website ?? tags.url ?? null,
      ])

      if (result.rows.length > 0) {
        osmIdToSystemId.set(`r${el.id}`, result.rows[0].id)
        systemsInserted++
      } else {
        systemsSkipped++ // already existed
      }
    } catch (err) {
      console.error(`  Error inserting system "${name}":`, err.message)
      systemsSkipped++
    }
  }

  console.log(`  Trail systems: ${systemsInserted} inserted, ${systemsSkipped} skipped/existed`)

  // ─── Insert individual trails from ways ────────────────────────────────────
  // For trails without a parent system, we can't link them — skip those.
  // Ways that share tags with a known system name can be linked.
  // For now: group ways by proximity (within ~10km) to the nearest system.
  // This is a best-effort approach; it's fine if some trails are unlinked.
  //
  // Simplified: only insert ways that we can match to a system via operator/network tag.

  console.log('\nInserting individual trails (matched to systems)...')
  let trailsInserted = 0, trailsSkipped = 0

  // Get all systems we just inserted (or already have) for proximity matching
  const { rows: allSystems } = await pool.query(`
    SELECT id, name, latitude, longitude FROM trail_systems
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `)

  function findNearestSystem(lat, lon, maxKm = 20) {
    let best = null, bestDist = Infinity
    for (const sys of allSystems) {
      const dlat = lat - sys.latitude
      const dlon = lon - sys.longitude
      const dist = Math.sqrt(dlat * dlat + dlon * dlon) * 111 // rough km
      if (dist < bestDist) { bestDist = dist; best = sys }
    }
    return bestDist <= maxKm ? best : null
  }

  for (const el of allWays) {
    const tags = el.tags ?? {}
    const name = tags.name ?? ''
    if (!name) { trailsSkipped++; continue }

    const center = getCenter(el)
    if (!center) { trailsSkipped++; continue }

    const system = findNearestSystem(center.lat, center.lon)
    if (!system) { trailsSkipped++; continue }

    const externalId = `osm-w${el.id}`
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
      if (result.rows.length > 0) trailsInserted++
      else trailsSkipped++
    } catch (err) {
      console.error(`  Error inserting trail "${name}":`, err.message)
      trailsSkipped++
    }
  }

  console.log(`  Trails: ${trailsInserted} inserted, ${trailsSkipped} skipped`)

  // Update trailCount on each system
  console.log('\nUpdating trail counts...')
  await pool.query(`
    UPDATE trail_systems ts
    SET "trailCount" = (
      SELECT COUNT(*) FROM trails t WHERE t."trailSystemId" = ts.id
    ),
    "updatedAt" = NOW()
    WHERE "importSource" = 'osm' OR "trailCount" = 0
  `)

  const { rows: stats } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM trail_systems WHERE "importSource" = 'osm') AS systems,
      (SELECT COUNT(*) FROM trails WHERE "importSource" = 'osm') AS trails
  `)
  console.log(`\nDone!`)
  console.log(`  Total OSM systems in DB: ${stats[0].systems}`)
  console.log(`  Total OSM trails in DB:  ${stats[0].trails}`)

  await pool.end()
}

main().catch(err => { console.error('Sync failed:', err); process.exit(1) })
