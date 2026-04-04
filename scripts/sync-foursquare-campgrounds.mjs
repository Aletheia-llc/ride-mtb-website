// Import campgrounds/camping from Foursquare Places API (Service API)
// Category 4bf58dd8d48988d1e4941735 = Campground
// Grids the US into ~500 overlapping cells (100km radius each)
// Safe to re-run — uses ON CONFLICT DO NOTHING on osmId
//
// Usage: FOURSQUARE_API_KEY=xxx node scripts/sync-foursquare-campgrounds.mjs

import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const FSQ_KEY = process.env.FOURSQUARE_API_KEY ?? 'K0MW2J2RDBJJ3MWHOCVPIMGZVSCBZZKYJSNLKKNHDIALCRHS'
const FSQ_URL = 'https://places-api.foursquare.com/places/search'
const CAMPGROUND_CATEGORY = '4bf58dd8d48988d1e4941735'
const RADIUS_M = 100_000  // 100km — max radius
const DELAY_MS = 250      // be polite to the API

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

function buildSlug(name, externalId) {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 55).replace(/-$/, '')
  return `${base}-${externalId.replace(':', '-')}`
}

// Generate grid centers covering the contiguous US + AK/HI
function generateGrid() {
  const cells = []
  // Contiguous US
  for (let lat = 25.5; lat <= 49.0; lat += 1.5) {
    for (let lon = -124.5; lon <= -67.0; lon += 2.0) {
      cells.push({ lat: +lat.toFixed(2), lon: +lon.toFixed(2) })
    }
  }
  // Alaska (rough coverage)
  for (let lat = 55.0; lat <= 71.0; lat += 3.0) {
    for (let lon = -168.0; lon <= -141.0; lon += 4.0) {
      cells.push({ lat: +lat.toFixed(2), lon: +lon.toFixed(2) })
    }
  }
  // Hawaii
  cells.push({ lat: 20.5, lon: -156.5 }, { lat: 21.3, lon: -157.8 })
  return cells
}

async function searchCell(lat, lon) {
  const url = new URL(FSQ_URL)
  url.searchParams.set('categories', CAMPGROUND_CATEGORY)
  url.searchParams.set('ll', `${lat},${lon}`)
  url.searchParams.set('radius', String(RADIUS_M))
  url.searchParams.set('limit', '50')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${FSQ_KEY}`,
      'X-Places-Api-Version': '2025-06-17',
      Accept: 'application/json',
    },
  })

  if (res.status === 429) {
    // Rate limited — back off 10 seconds
    await new Promise(r => setTimeout(r, 10_000))
    return searchCell(lat, lon)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FSQ ${res.status}: ${text.slice(0, 120)}`)
  }

  const json = await res.json()
  return json.results ?? []
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  console.log('Starting Foursquare campground import...')

  const grid = generateGrid()
  console.log(`Grid: ${grid.length} cells to search\n`)

  const seen = new Set()  // deduplicate within this run
  let totalFound = 0, inserted = 0, skipped = 0, errors = 0

  for (let i = 0; i < grid.length; i++) {
    const { lat, lon } = grid[i]
    process.stdout.write(`\r[${i + 1}/${grid.length}] ${lat},${lon}  found:${totalFound} inserted:${inserted}`)

    let results
    try {
      results = await searchCell(lat, lon)
    } catch (err) {
      process.stdout.write(`\n  Error at ${lat},${lon}: ${err.message}\n`)
      errors++
      await new Promise(r => setTimeout(r, DELAY_MS))
      continue
    }

    for (const place of results) {
      const fsqId = place.fsq_place_id
      if (!fsqId || seen.has(fsqId)) continue

      // Only insert actual campgrounds — skip fallback/unrelated results
      const isCampground = place.categories?.some(c => c.fsq_category_id === CAMPGROUND_CATEGORY)
      if (!isCampground) continue

      seen.add(fsqId)
      totalFound++

      const name = place.name?.trim()
      if (!name) { skipped++; continue }

      const placeLat = place.latitude ?? null
      const placeLon = place.longitude ?? null
      if (!placeLat || !placeLon) { skipped++; continue }

      const loc = place.location ?? {}
      const stateAbbr = loc.region?.toUpperCase() ?? null
      const stateInfo = stateAbbr ? (STATE_SLUG_MAP[stateAbbr] ?? null) : null

      const osmId = `fsq:${fsqId}`
      const slug = buildSlug(name, osmId)

      try {
        await pool.query(`
          INSERT INTO facilities (
            id, "osmId", type, name, slug, latitude, longitude,
            address, city, state, "stateSlug",
            phone, website,
            metadata, "lastSyncedAt", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, 'CAMPGROUND', $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11,
            $12::jsonb, NOW(), NOW(), NOW()
          )
          ON CONFLICT ("osmId") DO UPDATE SET
            type = 'CAMPGROUND',
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            "stateSlug" = EXCLUDED."stateSlug",
            phone = EXCLUDED.phone,
            website = EXCLUDED.website,
            metadata = EXCLUDED.metadata,
            "lastSyncedAt" = NOW(),
            "updatedAt" = NOW()
        `, [
          osmId, name, slug, placeLat, placeLon,
          loc.address ?? null,
          loc.locality ?? null,
          stateInfo?.name ?? null,
          stateInfo?.slug ?? null,
          place.tel ?? null,
          place.website ?? null,
          JSON.stringify({ source: 'foursquare', fsqId }),
        ])
        inserted++
      } catch (err) {
        errors++
      }
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\n\nDone!`)
  console.log(`  Unique campgrounds found: ${totalFound}`)
  console.log(`  Inserted (new):           ${inserted}`)
  console.log(`  Skipped/existed:          ${skipped}`)
  console.log(`  Errors:                   ${errors}`)

  const { rows } = await pool.query(`SELECT COUNT(*) FROM facilities WHERE type = 'CAMPGROUND'`)
  console.log(`  Total CAMPGROUND in DB:   ${rows[0].count}`)

  await pool.end()
}

main().catch(err => { console.error('Failed:', err); process.exit(1) })
