// Export facilities to CSV for auditing
// Usage: node scripts/export-facilities-audit.mjs
// Output: facilities-audit-YYYY-MM-DD.csv (opens in Excel/Google Sheets)

import pg from 'pg'
import { createWriteStream } from 'fs'

const { Pool } = pg

const DB_URL = 'postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres'

function escapeCsv(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(cols) {
  return cols.map(escapeCsv).join(',') + '\n'
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL, max: 3 })

  const { rows } = await pool.query(`
    SELECT
      type,
      name,
      city,
      state,
      website,
      phone,
      operator,
      "openingHours",
      -- key OSM tags from metadata
      metadata->>'leisure'       AS osm_leisure,
      metadata->>'sport'         AS osm_sport,
      metadata->>'tourism'       AS osm_tourism,
      metadata->>'landuse'       AS osm_landuse,
      metadata->>'mtb:scale'     AS osm_mtb_scale,
      metadata->>'cycling'       AS osm_cycling,
      metadata->>'mtb:type'      AS osm_mtb_type,
      metadata->>'description'   AS osm_description,
      latitude,
      longitude,
      "osmId",
      "lastSyncedAt"::date       AS last_synced
    FROM facilities
    WHERE type IN ('BIKEPARK', 'PUMPTRACK', 'BIKE_SHOP')
    ORDER BY type, state, name
  `)

  const filename = `facilities-audit-${new Date().toISOString().slice(0, 10)}.csv`
  const out = createWriteStream(filename)

  // Header
  out.write(row([
    'Type', 'Name', 'City', 'State', 'Website', 'Phone', 'Operator',
    'Opening Hours', 'OSM: leisure', 'OSM: sport', 'OSM: tourism',
    'OSM: landuse', 'OSM: mtb:scale', 'OSM: cycling', 'OSM: mtb:type',
    'OSM: description', 'Latitude', 'Longitude', 'OSM ID', 'Last Synced',
  ]))

  for (const r of rows) {
    out.write(row([
      r.type, r.name, r.city, r.state, r.website, r.phone, r.operator,
      r.openingHours, r.osm_leisure, r.osm_sport, r.osm_tourism,
      r.osm_landuse, r.osm_mtb_scale, r.osm_cycling, r.osm_mtb_type,
      r.osm_description, r.latitude, r.longitude, r.osmId, r.last_synced,
    ]))
  }

  out.end()

  const counts = rows.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1
    return acc
  }, {})

  console.log(`Exported ${rows.length} facilities to ${filename}`)
  console.log('Breakdown:')
  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type}: ${count}`)
  }

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
