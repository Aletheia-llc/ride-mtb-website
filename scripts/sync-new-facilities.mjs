import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
]
const US_BBOX = '24.396308,-124.848974,49.384358,-66.885444'
const TIMEOUT_MS = 120_000

const QUERIES = [
  {
    // All US ski resorts imported as BIKEPARK — many operate summer MTB; admins can prune later
    type: 'BIKEPARK',
    label: 'Ski Resorts (as Bike Parks)',
    query: `[out:json][timeout:90];(way["landuse"="winter_sports"](${US_BBOX});relation["landuse"="winter_sports"](${US_BBOX}););out center tags;`,
  },
  {
    // Node-only for bike shops — the vast majority of OSM bike shops are nodes
    type: 'BIKE_SHOP',
    label: 'Bike Shops',
    query: `[out:json][timeout:90];node["shop"="bicycle"](${US_BBOX});out center tags;`,
  },
]

const STATE_SLUG_MAP = {
  AL: { name: 'Alabama', slug: 'alabama' }, AK: { name: 'Alaska', slug: 'alaska' },
  AZ: { name: 'Arizona', slug: 'arizona' }, AR: { name: 'Arkansas', slug: 'arkansas' },
  CA: { name: 'California', slug: 'california' }, CO: { name: 'Colorado', slug: 'colorado' },
  CT: { name: 'Connecticut', slug: 'connecticut' }, DE: { name: 'Delaware', slug: 'delaware' },
  FL: { name: 'Florida', slug: 'florida' }, GA: { name: 'Georgia', slug: 'georgia' },
  HI: { name: 'Hawaii', slug: 'hawaii' }, ID: { name: 'Idaho', slug: 'idaho' },
  IL: { name: 'Illinois', slug: 'illinois' }, IN: { name: 'Indiana', slug: 'indiana' },
  IA: { name: 'Iowa', slug: 'iowa' }, KS: { name: 'Kansas', slug: 'kansas' },
  KY: { name: 'Kentucky', slug: 'kentucky' }, LA: { name: 'Louisiana', slug: 'louisiana' },
  ME: { name: 'Maine', slug: 'maine' }, MD: { name: 'Maryland', slug: 'maryland' },
  MA: { name: 'Massachusetts', slug: 'massachusetts' }, MI: { name: 'Michigan', slug: 'michigan' },
  MN: { name: 'Minnesota', slug: 'minnesota' }, MS: { name: 'Mississippi', slug: 'mississippi' },
  MO: { name: 'Missouri', slug: 'missouri' }, MT: { name: 'Montana', slug: 'montana' },
  NE: { name: 'Nebraska', slug: 'nebraska' }, NV: { name: 'Nevada', slug: 'nevada' },
  NH: { name: 'New Hampshire', slug: 'new-hampshire' }, NJ: { name: 'New Jersey', slug: 'new-jersey' },
  NM: { name: 'New Mexico', slug: 'new-mexico' }, NY: { name: 'New York', slug: 'new-york' },
  NC: { name: 'North Carolina', slug: 'north-carolina' }, ND: { name: 'North Dakota', slug: 'north-dakota' },
  OH: { name: 'Ohio', slug: 'ohio' }, OK: { name: 'Oklahoma', slug: 'oklahoma' },
  OR: { name: 'Oregon', slug: 'oregon' }, PA: { name: 'Pennsylvania', slug: 'pennsylvania' },
  RI: { name: 'Rhode Island', slug: 'rhode-island' }, SC: { name: 'South Carolina', slug: 'south-carolina' },
  SD: { name: 'South Dakota', slug: 'south-dakota' }, TN: { name: 'Tennessee', slug: 'tennessee' },
  TX: { name: 'Texas', slug: 'texas' }, UT: { name: 'Utah', slug: 'utah' },
  VT: { name: 'Vermont', slug: 'vermont' }, VA: { name: 'Virginia', slug: 'virginia' },
  WA: { name: 'Washington', slug: 'washington' }, WV: { name: 'West Virginia', slug: 'west-virginia' },
  WI: { name: 'Wisconsin', slug: 'wisconsin' }, WY: { name: 'Wyoming', slug: 'wyoming' },
  DC: { name: 'Washington DC', slug: 'washington-dc' },
}

function buildOsmId(element) {
  if (element.type === 'node') return `n${element.id}`
  if (element.type === 'relation') return `r${element.id}`
  return `w${element.id}`
}

function getCenter(element) {
  if (element.type === 'way' && element.center) return element.center
  if (element.lat != null && element.lon != null) return { lat: element.lat, lon: element.lon }
  return null
}

function buildSlug(name, osmId) {
  const base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60).replace(/-$/, '')
  return `${base}-${osmId}`
}

function parseOsmElement(element, facilityType) {
  const tags = element.tags ?? {}
  const osmId = buildOsmId(element)
  const center = getCenter(element)
  if (!center) return null
  const name = tags.name ?? tags['name:en'] ?? ''
  if (!name) return null

  const stateAbbr = tags['addr:state'] ?? null
  const stateInfo = stateAbbr ? (STATE_SLUG_MAP[stateAbbr.toUpperCase()] ?? null) : null
  const litTag = tags.lit
  const feeTag = tags.fee

  return {
    osmId, type: facilityType, name, slug: buildSlug(name, osmId),
    latitude: center.lat, longitude: center.lon,
    address: tags['addr:housenumber'] && tags['addr:street'] ? `${tags['addr:housenumber']} ${tags['addr:street']}` : null,
    city: tags['addr:city'] ?? null,
    state: stateInfo?.name ?? null, stateSlug: stateInfo?.slug ?? null,
    operator: tags.operator ?? null, openingHours: tags.opening_hours ?? null,
    surface: tags.surface ?? null,
    website: tags.website ?? tags.url ?? null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    lit: litTag === 'yes' ? true : litTag === 'no' ? false : null,
    fee: feeTag === 'yes' ? true : feeTag === 'no' ? false : null,
    metadata: tags,
  }
}

async function runOverpassQuery(query, retries = 4) {
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
        // HTML error page means overloaded/unavailable
        console.warn(`  Got ${res.ok ? 'HTML error' : res.status} from ${url}`)
        if (attempt < retries - 1) continue
        throw new Error(`All endpoints failed. Last response: ${text.slice(0, 100)}`)
      }
      const json = JSON.parse(text)
      return json.elements ?? []
    } catch (err) {
      if (attempt < retries - 1) {
        console.warn(`  Request failed: ${err.message}`)
        continue
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('All retries exhausted')
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  for (let i = 0; i < QUERIES.length; i++) {
    const { type, label, query } = QUERIES[i]
    console.log(`\n[${i + 1}/${QUERIES.length}] ${label}`)

    if (i > 0) {
      console.log('  Waiting 3s before next query...')
      await new Promise(r => setTimeout(r, 3000))
    }

    let elements
    try {
      elements = await runOverpassQuery(query)
    } catch (err) {
      console.error(`  Overpass query failed: ${err.message}`)
      continue
    }
    console.log(`  Got ${elements.length} elements from OSM`)

    let upserted = 0, skipped = 0

    for (const element of elements) {
      const facility = parseOsmElement(element, type)
      if (!facility) { skipped++; continue }

      await pool.query(`
        INSERT INTO facilities (
          id, "osmId", type, name, slug, latitude, longitude,
          address, city, state, "stateSlug", operator, "openingHours",
          surface, website, phone, lit, fee, metadata, "lastSyncedAt",
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18::jsonb, NOW(),
          NOW(), NOW()
        )
        ON CONFLICT ("osmId") DO UPDATE SET
          name = EXCLUDED.name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
          address = EXCLUDED.address, city = EXCLUDED.city, state = EXCLUDED.state,
          "stateSlug" = EXCLUDED."stateSlug", operator = EXCLUDED.operator,
          "openingHours" = EXCLUDED."openingHours", surface = EXCLUDED.surface,
          website = EXCLUDED.website, phone = EXCLUDED.phone,
          lit = EXCLUDED.lit, fee = EXCLUDED.fee, metadata = EXCLUDED.metadata,
          "lastSyncedAt" = NOW(), "updatedAt" = NOW()
      `, [
        facility.osmId, facility.type, facility.name, facility.slug,
        facility.latitude, facility.longitude,
        facility.address, facility.city, facility.state, facility.stateSlug,
        facility.operator, facility.openingHours,
        facility.surface, facility.website, facility.phone,
        facility.lit, facility.fee, JSON.stringify(facility.metadata),
      ]).then(() => { upserted++ }).catch(err => {
        console.error(`  Error upserting ${facility.name}:`, err.message)
        skipped++
      })
    }

    console.log(`  Upserted: ${upserted}, skipped: ${skipped}`)
  }

  await pool.end()
  console.log('\nDone!')
}

main().catch(err => { console.error('Sync failed:', err); process.exit(1) })
