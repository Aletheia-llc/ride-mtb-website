// Import bike shops from Google Places API (New)
// Type: bicycle_store
// Grids the US into ~1800 overlapping cells (50km radius each)
// Safe to re-run — uses ON CONFLICT DO NOTHING on osmId
//
// Usage: GOOGLE_PLACES_KEY=xxx node scripts/sync-google-shops.mjs
// Cost: ~$40-80 per full run (covered by $200/mo free tier)

import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const API_KEY = process.env.GOOGLE_PLACES_KEY ?? ''
const API_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const RADIUS_M = 50_000   // 50km — max for Nearby Search
const DELAY_MS = 200      // be polite

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

// Reverse lookup: full state name → abbreviation
const STATE_NAME_TO_ABBR = {}
for (const [abbr, info] of Object.entries(STATE_SLUG_MAP)) {
  STATE_NAME_TO_ABBR[info.name] = abbr
  STATE_NAME_TO_ABBR[info.name.toLowerCase()] = abbr
}

function buildSlug(name, externalId) {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 55).replace(/-$/, '')
  return `${base}-${externalId.replace(/[^a-z0-9-]/g, '-').slice(0, 20)}`
}

// State bounding boxes for filtering (lat_min, lat_max, lon_min, lon_max)
const STATE_BBOX = {
  AL: [30.2, 35.0, -88.5, -84.9], AK: [51.2, 71.4, -179.1, -129.9],
  AZ: [31.3, 37.0, -114.8, -109.0], AR: [33.0, 36.5, -94.6, -89.6],
  CA: [32.5, 42.0, -124.4, -114.1], CO: [37.0, 41.0, -109.1, -102.0],
  CT: [41.0, 42.1, -73.7, -71.8], DE: [38.5, 39.8, -75.8, -75.0],
  FL: [24.5, 31.0, -87.6, -80.0], GA: [30.4, 35.0, -85.6, -80.8],
  HI: [18.9, 22.2, -160.2, -154.8], ID: [42.0, 49.0, -117.2, -111.0],
  IL: [37.0, 42.5, -91.5, -87.5], IN: [37.8, 41.8, -88.1, -84.8],
  IA: [40.4, 43.5, -96.6, -90.1], KS: [37.0, 40.0, -102.1, -94.6],
  KY: [36.5, 39.1, -89.6, -81.9], LA: [29.0, 33.0, -94.0, -89.0],
  ME: [43.1, 47.5, -71.1, -66.9], MD: [37.9, 39.7, -79.5, -75.0],
  MA: [41.2, 42.9, -73.5, -69.9], MI: [41.7, 48.3, -90.4, -82.4],
  MN: [43.5, 49.4, -97.2, -89.5], MS: [30.2, 35.0, -91.7, -88.1],
  MO: [36.0, 40.6, -95.8, -89.1], MT: [44.4, 49.0, -116.0, -104.0],
  NE: [40.0, 43.0, -104.1, -95.3], NV: [35.0, 42.0, -120.0, -114.0],
  NH: [42.7, 45.3, -72.6, -70.7], NJ: [38.9, 41.4, -75.6, -73.9],
  NM: [31.3, 37.0, -109.1, -103.0], NY: [40.5, 45.0, -79.8, -71.9],
  NC: [33.8, 36.6, -84.3, -75.5], ND: [45.9, 49.0, -104.0, -96.6],
  OH: [38.4, 42.0, -84.8, -80.5], OK: [33.6, 37.0, -103.0, -94.4],
  OR: [42.0, 46.3, -124.6, -116.5], PA: [39.7, 42.3, -80.5, -74.7],
  RI: [41.1, 42.0, -71.9, -71.1], SC: [32.0, 35.2, -83.4, -78.5],
  SD: [42.5, 46.0, -104.1, -96.4], TN: [35.0, 36.7, -90.3, -81.6],
  TX: [25.8, 36.5, -106.6, -93.5], UT: [37.0, 42.0, -114.1, -109.0],
  VT: [42.7, 45.0, -73.4, -71.5], VA: [36.5, 39.5, -83.7, -75.2],
  WA: [45.5, 49.0, -124.8, -116.9], WV: [37.2, 40.6, -82.6, -77.7],
  WI: [42.5, 47.1, -92.9, -86.8], WY: [41.0, 45.0, -111.1, -104.1],
  DC: [38.8, 39.0, -77.1, -76.9],
}

// Denser grid than Foursquare (50km radius vs 100km)
// Optional stateFilter: 2-letter abbreviation (e.g., "AR") to limit grid
function generateGrid(stateFilter) {
  const cells = []

  if (stateFilter) {
    const bbox = STATE_BBOX[stateFilter.toUpperCase()]
    if (!bbox) { console.error(`Unknown state: ${stateFilter}`); process.exit(1) }
    const [latMin, latMax, lonMin, lonMax] = bbox
    for (let lat = latMin; lat <= latMax; lat += 0.75) {
      for (let lon = lonMin; lon <= lonMax; lon += 1.0) {
        cells.push({ lat: +lat.toFixed(2), lon: +lon.toFixed(2) })
      }
    }
    return cells
  }

  // Contiguous US — 0.75° lat × 1.0° lon (~83km × ~85km at 40°N, good overlap with 50km radius)
  for (let lat = 25.0; lat <= 49.5; lat += 0.75) {
    for (let lon = -125.0; lon <= -66.5; lon += 1.0) {
      cells.push({ lat: +lat.toFixed(2), lon: +lon.toFixed(2) })
    }
  }
  // Alaska
  for (let lat = 55.0; lat <= 71.0; lat += 1.5) {
    for (let lon = -168.0; lon <= -141.0; lon += 2.0) {
      cells.push({ lat: +lat.toFixed(2), lon: +lon.toFixed(2) })
    }
  }
  // Hawaii
  cells.push({ lat: 19.5, lon: -155.5 }, { lat: 20.8, lon: -156.3 }, { lat: 21.3, lon: -157.8 })
  return cells
}

function parseState(addressComponents) {
  if (!addressComponents) return null
  const stateComp = addressComponents.find(c =>
    c.types?.includes('administrative_area_level_1')
  )
  if (!stateComp) return null
  // Try short text first (e.g., "CA"), then long text (e.g., "California")
  const short = stateComp.shortText?.toUpperCase()
  if (short && STATE_SLUG_MAP[short]) return short
  const long = stateComp.longText
  if (long && STATE_NAME_TO_ABBR[long]) return STATE_NAME_TO_ABBR[long]
  if (long && STATE_NAME_TO_ABBR[long.toLowerCase()]) return STATE_NAME_TO_ABBR[long.toLowerCase()]
  return null
}

function parseCity(addressComponents) {
  if (!addressComponents) return null
  const cityComp = addressComponents.find(c =>
    c.types?.includes('locality')
  )
  return cityComp?.longText ?? null
}

async function searchCell(lat, lon) {
  const body = {
    includedTypes: ['bicycle_store'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lon },
        radius: RADIUS_M,
      },
    },
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.location',
        'places.formattedAddress',
        'places.addressComponents',
        'places.nationalPhoneNumber',
        'places.websiteUri',
      ].join(','),
    },
    body: JSON.stringify(body),
  })

  if (res.status === 429) {
    console.log('\n  Rate limited — waiting 30s...')
    await new Promise(r => setTimeout(r, 30_000))
    return searchCell(lat, lon)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  return json.places ?? []
}

async function main() {
  if (!API_KEY) {
    console.error('Set GOOGLE_PLACES_KEY env var')
    process.exit(1)
  }

  const stateFilter = process.argv[2] ?? null
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  console.log(`Starting Google Places import (bicycle_store)${stateFilter ? ` — ${stateFilter} only` : ' — all US'}...`)

  const grid = generateGrid(stateFilter)
  console.log(`Grid: ${grid.length} cells to search\n`)

  const seen = new Set()
  let totalFound = 0, inserted = 0, skipped = 0, errors = 0

  for (let i = 0; i < grid.length; i++) {
    const { lat, lon } = grid[i]
    process.stdout.write(`\r[${i + 1}/${grid.length}] ${lat},${lon}  found:${totalFound} inserted:${inserted}`)

    let places
    try {
      places = await searchCell(lat, lon)
    } catch (err) {
      process.stdout.write(`\n  Error at ${lat},${lon}: ${err.message}\n`)
      errors++
      await new Promise(r => setTimeout(r, DELAY_MS))
      continue
    }

    for (const place of places) {
      const placeId = place.id
      if (!placeId || seen.has(placeId)) continue
      seen.add(placeId)
      totalFound++

      const name = place.displayName?.text?.trim()
      if (!name) { skipped++; continue }

      const placeLat = place.location?.latitude ?? null
      const placeLon = place.location?.longitude ?? null
      if (!placeLat || !placeLon) { skipped++; continue }

      const stateAbbr = parseState(place.addressComponents)
      const stateInfo = stateAbbr ? (STATE_SLUG_MAP[stateAbbr] ?? null) : null
      const city = parseCity(place.addressComponents)

      const osmId = `gpl:${placeId}`
      const slug = buildSlug(name, placeId)

      try {
        await pool.query(`
          INSERT INTO facilities (
            id, "osmId", type, name, slug, latitude, longitude,
            address, city, state, "stateSlug",
            phone, website,
            metadata, "lastSyncedAt", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, 'BIKE_SHOP', $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11,
            $12::jsonb, NOW(), NOW(), NOW()
          )
          ON CONFLICT ("osmId") DO NOTHING
        `, [
          osmId, name, slug, placeLat, placeLon,
          place.formattedAddress ?? null,
          city,
          stateInfo?.name ?? null,
          stateInfo?.slug ?? null,
          place.nationalPhoneNumber ?? null,
          place.websiteUri ?? null,
          JSON.stringify({ source: 'google_places', placeId }),
        ])
        inserted++
      } catch (err) {
        errors++
      }
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\n\nDone!`)
  console.log(`  Unique shops found: ${totalFound}`)
  console.log(`  Inserted (new):     ${inserted}`)
  console.log(`  Skipped/existed:    ${skipped}`)
  console.log(`  Errors:             ${errors}`)

  const { rows } = await pool.query(`SELECT COUNT(*) FROM facilities WHERE type = 'BIKE_SHOP'`)
  console.log(`  Total BIKE_SHOP in DB: ${rows[0].count}`)

  await pool.end()
}

main().catch(err => { console.error('Failed:', err); process.exit(1) })
