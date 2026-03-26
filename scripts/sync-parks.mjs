// Standalone parks sync script — bypasses auth, calls Overpass + DB directly
import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const US_BBOX = '24.396308,-124.848974,49.384358,-66.885444'
const TIMEOUT_MS = 90_000

const QUERIES = [
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
    query: `[out:json][timeout:60];(way["leisure"="bikepark"](${US_BBOX});relation["leisure"="bikepark"](${US_BBOX});way["sport"="mountain_biking"](${US_BBOX});relation["sport"="mountain_biking"](${US_BBOX});way["sport"="cycling"]["name"~"bike park|bikepark|jump park|skills park|dirt jump",i](${US_BBOX});relation["sport"="cycling"]["name"~"bike park|bikepark|jump park|skills park|dirt jump",i](${US_BBOX}););out center tags;`,
  },
]

const STATE_SLUG_MAP = {
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

function buildOsmId(element) {
  const prefix = element.type === 'relation' ? 'r' : 'w'
  return `${prefix}${element.id}`
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
    osmId,
    type: facilityType,
    name,
    slug: buildSlug(name, osmId),
    latitude: center.lat,
    longitude: center.lon,
    address: tags['addr:housenumber'] && tags['addr:street'] ? `${tags['addr:housenumber']} ${tags['addr:street']}` : null,
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

async function runOverpassQuery(query) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    console.log('  Querying Overpass API...')
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`)
    const json = await res.json()
    return json.elements ?? []
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  let totalAdded = 0
  let totalUpdated = 0

  for (let i = 0; i < QUERIES.length; i++) {
    const { type, label, query } = QUERIES[i]
    console.log(`\n[${i + 1}/${QUERIES.length}] ${label}`)

    if (i > 0) {
      console.log('  Waiting 2s before next query...')
      await new Promise(r => setTimeout(r, 2000))
    }

    const elements = await runOverpassQuery(query)
    console.log(`  Got ${elements.length} elements from OSM`)

    let added = 0, updated = 0, skipped = 0

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
          name = EXCLUDED.name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          "stateSlug" = EXCLUDED."stateSlug",
          operator = EXCLUDED.operator,
          "openingHours" = EXCLUDED."openingHours",
          surface = EXCLUDED.surface,
          website = EXCLUDED.website,
          phone = EXCLUDED.phone,
          lit = EXCLUDED.lit,
          fee = EXCLUDED.fee,
          metadata = EXCLUDED.metadata,
          "lastSyncedAt" = NOW(),
          "updatedAt" = NOW()
      `, [
        facility.osmId, facility.type, facility.name, facility.slug,
        facility.latitude, facility.longitude,
        facility.address, facility.city, facility.state, facility.stateSlug,
        facility.operator, facility.openingHours,
        facility.surface, facility.website, facility.phone,
        facility.lit, facility.fee,
        JSON.stringify(facility.metadata),
      ]).then(result => {
        // rowCount 1 = insert, but we can't tell insert vs update easily with ON CONFLICT
        // check if it existed before via osmId lookup would add complexity, just count
        added++
      }).catch(err => {
        console.error(`  Error upserting ${facility.name}:`, err.message)
        skipped++
      })
    }

    console.log(`  Upserted ${added}, skipped ${skipped}`)
    totalAdded += added
  }

  console.log(`\nDone! Total upserted: ${totalAdded}`)
  await pool.end()
}

main().catch(err => {
  console.error('Sync failed:', err)
  process.exit(1)
})
