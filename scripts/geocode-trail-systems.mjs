// Reverse-geocode state + city for OSM trail systems that have lat/lon but no state.
// Uses OpenStreetMap Nominatim at 1 req/sec (required by their usage policy).
// Safe to re-run — skips systems that already have a state.
//
// Usage: node scripts/geocode-trail-systems.mjs

import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse'
const DELAY_MS = 1100  // Nominatim requires >= 1 req/sec

const STATE_SLUG_MAP = {
  Alabama: { abbr: 'AL', slug: 'alabama' }, Alaska: { abbr: 'AK', slug: 'alaska' },
  Arizona: { abbr: 'AZ', slug: 'arizona' }, Arkansas: { abbr: 'AR', slug: 'arkansas' },
  California: { abbr: 'CA', slug: 'california' }, Colorado: { abbr: 'CO', slug: 'colorado' },
  Connecticut: { abbr: 'CT', slug: 'connecticut' }, Delaware: { abbr: 'DE', slug: 'delaware' },
  Florida: { abbr: 'FL', slug: 'florida' }, Georgia: { abbr: 'GA', slug: 'georgia' },
  Hawaii: { abbr: 'HI', slug: 'hawaii' }, Idaho: { abbr: 'ID', slug: 'idaho' },
  Illinois: { abbr: 'IL', slug: 'illinois' }, Indiana: { abbr: 'IN', slug: 'indiana' },
  Iowa: { abbr: 'IA', slug: 'iowa' }, Kansas: { abbr: 'KS', slug: 'kansas' },
  Kentucky: { abbr: 'KY', slug: 'kentucky' }, Louisiana: { abbr: 'LA', slug: 'louisiana' },
  Maine: { abbr: 'ME', slug: 'maine' }, Maryland: { abbr: 'MD', slug: 'maryland' },
  Massachusetts: { abbr: 'MA', slug: 'massachusetts' }, Michigan: { abbr: 'MI', slug: 'michigan' },
  Minnesota: { abbr: 'MN', slug: 'minnesota' }, Mississippi: { abbr: 'MS', slug: 'mississippi' },
  Missouri: { abbr: 'MO', slug: 'missouri' }, Montana: { abbr: 'MT', slug: 'montana' },
  Nebraska: { abbr: 'NE', slug: 'nebraska' }, Nevada: { abbr: 'NV', slug: 'nevada' },
  'New Hampshire': { abbr: 'NH', slug: 'new-hampshire' }, 'New Jersey': { abbr: 'NJ', slug: 'new-jersey' },
  'New Mexico': { abbr: 'NM', slug: 'new-mexico' }, 'New York': { abbr: 'NY', slug: 'new-york' },
  'North Carolina': { abbr: 'NC', slug: 'north-carolina' }, 'North Dakota': { abbr: 'ND', slug: 'north-dakota' },
  Ohio: { abbr: 'OH', slug: 'ohio' }, Oklahoma: { abbr: 'OK', slug: 'oklahoma' },
  Oregon: { abbr: 'OR', slug: 'oregon' }, Pennsylvania: { abbr: 'PA', slug: 'pennsylvania' },
  'Rhode Island': { abbr: 'RI', slug: 'rhode-island' }, 'South Carolina': { abbr: 'SC', slug: 'south-carolina' },
  'South Dakota': { abbr: 'SD', slug: 'south-dakota' }, Tennessee: { abbr: 'TN', slug: 'tennessee' },
  Texas: { abbr: 'TX', slug: 'texas' }, Utah: { abbr: 'UT', slug: 'utah' },
  Vermont: { abbr: 'VT', slug: 'vermont' }, Virginia: { abbr: 'VA', slug: 'virginia' },
  Washington: { abbr: 'WA', slug: 'washington' }, 'West Virginia': { abbr: 'WV', slug: 'west-virginia' },
  Wisconsin: { abbr: 'WI', slug: 'wisconsin' }, Wyoming: { abbr: 'WY', slug: 'wyoming' },
  'District of Columbia': { abbr: 'DC', slug: 'washington-dc' },
}

async function reverseGeocode(lat, lon) {
  const url = new URL(NOMINATIM)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('format', 'json')
  url.searchParams.set('zoom', '8')  // state/county level — faster, less data

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'RideMTB/1.0 (trail data geocoding; contact: admin@ride-mtb.com)',
      'Accept-Language': 'en',
    },
  })

  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 5000))
    return reverseGeocode(lat, lon)
  }

  if (!res.ok) throw new Error(`Nominatim ${res.status}`)

  const json = await res.json()
  const addr = json.address ?? {}

  const stateName = addr.state ?? null
  const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? null
  const countryCode = json.address?.country_code?.toUpperCase() ?? null

  return { stateName, city, countryCode }
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 2 })

  const { rows: systems } = await pool.query(`
    SELECT id, latitude, longitude
    FROM trail_systems
    WHERE state IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY id
  `)

  console.log(`Geocoding ${systems.length} trail systems...`)
  console.log('(~1 req/sec — this will take a while)\n')

  let updated = 0, skipped = 0, errors = 0

  for (let i = 0; i < systems.length; i++) {
    const { id, latitude, longitude } = systems[i]
    process.stdout.write(`\r[${i + 1}/${systems.length}] updated:${updated} skipped:${skipped} errors:${errors}`)

    try {
      const { stateName, city, countryCode } = await reverseGeocode(latitude, longitude)

      // Only fill in US state data — skip Canada/Mexico/etc.
      if (countryCode !== 'US') {
        // Update country but leave state/city null for non-US
        skipped++
        await new Promise(r => setTimeout(r, DELAY_MS))
        continue
      }

      const stateInfo = stateName ? (STATE_SLUG_MAP[stateName] ?? null) : null

      await pool.query(`
        UPDATE trail_systems
        SET
          state = $1,
          city = $2,
          "updatedAt" = NOW()
        WHERE id = $3
      `, [
        stateInfo?.abbr ?? null,
        city,
        id,
      ])

      updated++
    } catch (err) {
      errors++
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\n\nDone!`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped (non-US): ${skipped}`)
  console.log(`  Errors:  ${errors}`)

  const { rows: stats } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE state IS NOT NULL) AS with_state,
      COUNT(*) AS total
    FROM trail_systems
  `)
  console.log(`  Systems with state: ${stats[0].with_state} / ${stats[0].total}`)

  await pool.end()
}

main().catch(err => { console.error('Failed:', err); process.exit(1) })
