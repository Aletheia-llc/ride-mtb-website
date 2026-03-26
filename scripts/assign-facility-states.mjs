// Bulk-assign state/stateSlug to facilities missing them, using lat/lon bounding boxes
import pg from 'pg'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'

const STATES = [
  { abbr: 'AL', name: 'Alabama',        slug: 'alabama',        minLat: 30.14, maxLat: 35.01, minLon: -88.47, maxLon: -84.89 },
  { abbr: 'AK', name: 'Alaska',         slug: 'alaska',         minLat: 54.56, maxLat: 71.54, minLon: -179.15, maxLon: -129.99 },
  { abbr: 'AZ', name: 'Arizona',        slug: 'arizona',        minLat: 31.33, maxLat: 37.00, minLon: -114.82, maxLon: -109.05 },
  { abbr: 'AR', name: 'Arkansas',       slug: 'arkansas',       minLat: 33.00, maxLat: 36.50, minLon: -94.62, maxLon: -89.64 },
  { abbr: 'CA', name: 'California',     slug: 'california',     minLat: 32.53, maxLat: 42.01, minLon: -124.41, maxLon: -114.13 },
  { abbr: 'CO', name: 'Colorado',       slug: 'colorado',       minLat: 36.99, maxLat: 41.00, minLon: -109.06, maxLon: -102.04 },
  { abbr: 'CT', name: 'Connecticut',    slug: 'connecticut',    minLat: 40.95, maxLat: 42.05, minLon: -73.73, maxLon: -71.79 },
  { abbr: 'DE', name: 'Delaware',       slug: 'delaware',       minLat: 38.45, maxLat: 39.84, minLon: -75.79, maxLon: -74.98 },
  { abbr: 'FL', name: 'Florida',        slug: 'florida',        minLat: 24.54, maxLat: 31.00, minLon: -87.63, maxLon: -79.97 },
  { abbr: 'GA', name: 'Georgia',        slug: 'georgia',        minLat: 30.36, maxLat: 35.00, minLon: -85.61, maxLon: -80.84 },
  { abbr: 'HI', name: 'Hawaii',         slug: 'hawaii',         minLat: 18.91, maxLat: 22.24, minLon: -160.24, maxLon: -154.81 },
  { abbr: 'ID', name: 'Idaho',          slug: 'idaho',          minLat: 41.99, maxLat: 49.00, minLon: -117.24, maxLon: -111.04 },
  { abbr: 'IL', name: 'Illinois',       slug: 'illinois',       minLat: 36.97, maxLat: 42.51, minLon: -91.51, maxLon: -87.02 },
  { abbr: 'IN', name: 'Indiana',        slug: 'indiana',        minLat: 37.77, maxLat: 41.76, minLon: -88.10, maxLon: -84.78 },
  { abbr: 'IA', name: 'Iowa',           slug: 'iowa',           minLat: 40.38, maxLat: 43.50, minLon: -96.64, maxLon: -90.14 },
  { abbr: 'KS', name: 'Kansas',         slug: 'kansas',         minLat: 36.99, maxLat: 40.00, minLon: -102.05, maxLon: -94.59 },
  { abbr: 'KY', name: 'Kentucky',       slug: 'kentucky',       minLat: 36.50, maxLat: 39.15, minLon: -89.57, maxLon: -81.96 },
  { abbr: 'LA', name: 'Louisiana',      slug: 'louisiana',      minLat: 28.92, maxLat: 33.02, minLon: -94.04, maxLon: -88.82 },
  { abbr: 'ME', name: 'Maine',          slug: 'maine',          minLat: 43.05, maxLat: 47.46, minLon: -71.08, maxLon: -66.95 },
  { abbr: 'MD', name: 'Maryland',       slug: 'maryland',       minLat: 37.91, maxLat: 39.72, minLon: -79.49, maxLon: -74.99 },
  { abbr: 'MA', name: 'Massachusetts',  slug: 'massachusetts',  minLat: 41.24, maxLat: 42.89, minLon: -73.51, maxLon: -69.93 },
  { abbr: 'MI', name: 'Michigan',       slug: 'michigan',       minLat: 41.70, maxLat: 48.31, minLon: -90.42, maxLon: -82.41 },
  { abbr: 'MN', name: 'Minnesota',      slug: 'minnesota',      minLat: 43.50, maxLat: 49.38, minLon: -97.24, maxLon: -89.49 },
  { abbr: 'MS', name: 'Mississippi',    slug: 'mississippi',    minLat: 30.17, maxLat: 35.00, minLon: -91.66, maxLon: -88.10 },
  { abbr: 'MO', name: 'Missouri',       slug: 'missouri',       minLat: 35.99, maxLat: 40.61, minLon: -95.77, maxLon: -89.10 },
  { abbr: 'MT', name: 'Montana',        slug: 'montana',        minLat: 44.36, maxLat: 49.00, minLon: -116.05, maxLon: -104.04 },
  { abbr: 'NE', name: 'Nebraska',       slug: 'nebraska',       minLat: 39.99, maxLat: 43.00, minLon: -104.05, maxLon: -95.31 },
  { abbr: 'NV', name: 'Nevada',         slug: 'nevada',         minLat: 35.00, maxLat: 42.00, minLon: -120.00, maxLon: -114.04 },
  { abbr: 'NH', name: 'New Hampshire',  slug: 'new-hampshire',  minLat: 42.70, maxLat: 45.31, minLon: -72.56, maxLon: -70.61 },
  { abbr: 'NJ', name: 'New Jersey',     slug: 'new-jersey',     minLat: 38.93, maxLat: 41.36, minLon: -75.56, maxLon: -73.89 },
  { abbr: 'NM', name: 'New Mexico',     slug: 'new-mexico',     minLat: 31.33, maxLat: 37.00, minLon: -109.05, maxLon: -103.00 },
  { abbr: 'NY', name: 'New York',       slug: 'new-york',       minLat: 40.50, maxLat: 45.02, minLon: -79.76, maxLon: -71.86 },
  { abbr: 'NC', name: 'North Carolina', slug: 'north-carolina', minLat: 33.84, maxLat: 36.59, minLon: -84.32, maxLon: -75.46 },
  { abbr: 'ND', name: 'North Dakota',   slug: 'north-dakota',   minLat: 45.93, maxLat: 49.00, minLon: -104.05, maxLon: -96.55 },
  { abbr: 'OH', name: 'Ohio',           slug: 'ohio',           minLat: 38.40, maxLat: 41.98, minLon: -84.82, maxLon: -80.52 },
  { abbr: 'OK', name: 'Oklahoma',       slug: 'oklahoma',       minLat: 33.62, maxLat: 37.00, minLon: -103.00, maxLon: -94.43 },
  { abbr: 'OR', name: 'Oregon',         slug: 'oregon',         minLat: 41.99, maxLat: 46.24, minLon: -124.57, maxLon: -116.46 },
  { abbr: 'PA', name: 'Pennsylvania',   slug: 'pennsylvania',   minLat: 39.72, maxLat: 42.27, minLon: -80.52, maxLon: -74.69 },
  { abbr: 'RI', name: 'Rhode Island',   slug: 'rhode-island',   minLat: 41.15, maxLat: 42.02, minLon: -71.86, maxLon: -71.12 },
  { abbr: 'SC', name: 'South Carolina', slug: 'south-carolina', minLat: 32.04, maxLat: 35.22, minLon: -83.36, maxLon: -78.54 },
  { abbr: 'SD', name: 'South Dakota',   slug: 'south-dakota',   minLat: 42.48, maxLat: 45.94, minLon: -104.06, maxLon: -96.44 },
  { abbr: 'TN', name: 'Tennessee',      slug: 'tennessee',      minLat: 34.98, maxLat: 36.68, minLon: -90.31, maxLon: -81.65 },
  { abbr: 'TX', name: 'Texas',          slug: 'texas',          minLat: 25.84, maxLat: 36.50, minLon: -106.65, maxLon: -93.51 },
  { abbr: 'UT', name: 'Utah',           slug: 'utah',           minLat: 36.99, maxLat: 42.00, minLon: -114.05, maxLon: -109.04 },
  { abbr: 'VT', name: 'Vermont',        slug: 'vermont',        minLat: 42.73, maxLat: 45.02, minLon: -73.44, maxLon: -71.50 },
  { abbr: 'VA', name: 'Virginia',       slug: 'virginia',       minLat: 36.54, maxLat: 39.47, minLon: -83.68, maxLon: -75.24 },
  { abbr: 'WA', name: 'Washington',     slug: 'washington',     minLat: 45.54, maxLat: 49.00, minLon: -124.73, maxLon: -116.92 },
  { abbr: 'WV', name: 'West Virginia',  slug: 'west-virginia',  minLat: 37.20, maxLat: 40.64, minLon: -82.64, maxLon: -77.72 },
  { abbr: 'WI', name: 'Wisconsin',      slug: 'wisconsin',      minLat: 42.49, maxLat: 47.31, minLon: -92.89, maxLon: -86.25 },
  { abbr: 'WY', name: 'Wyoming',        slug: 'wyoming',        minLat: 40.99, maxLat: 45.01, minLon: -111.06, maxLon: -104.05 },
  { abbr: 'DC', name: 'Washington DC',  slug: 'washington-dc',  minLat: 38.79, maxLat: 38.99, minLon: -77.12, maxLon: -76.91 },
]

function latLonToState(lat, lon) {
  const matches = STATES.filter(
    s => lat >= s.minLat && lat <= s.maxLat && lon >= s.minLon && lon <= s.maxLon
  )
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]
  // Multiple matches (bounding boxes overlap) — pick the one whose centroid is closest
  return matches.reduce((best, s) => {
    const cLat = (s.minLat + s.maxLat) / 2
    const cLon = (s.minLon + s.maxLon) / 2
    const dist = Math.hypot(lat - cLat, lon - cLon)
    const bestCLat = (best.minLat + best.maxLat) / 2
    const bestCLon = (best.minLon + best.maxLon) / 2
    const bestDist = Math.hypot(lat - bestCLat, lon - bestCLon)
    return dist < bestDist ? s : best
  })
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  const { rows } = await pool.query(
    `SELECT id, latitude, longitude FROM facilities WHERE "stateSlug" IS NULL`
  )
  console.log(`Found ${rows.length} facilities missing state`)

  let updated = 0, skipped = 0

  for (const row of rows) {
    const state = latLonToState(row.latitude, row.longitude)
    if (!state) { skipped++; continue }

    await pool.query(
      `UPDATE facilities SET state = $1, "stateSlug" = $2, "updatedAt" = NOW() WHERE id = $3`,
      [state.name, state.slug, row.id]
    )
    updated++
  }

  console.log(`Updated: ${updated}, skipped (outside US): ${skipped}`)
  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
