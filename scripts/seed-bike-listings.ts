/**
 * Seed the bike_listings table from the static bike-listings data.
 * Run with: npx tsx scripts/seed-bike-listings.ts
 */
import { Pool } from 'pg'
import { BIKE_LISTINGS } from '../src/modules/bikes/lib/bike-listings'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_POOLED_URL?.trim()
if (!connectionString) throw new Error('No database connection string found in environment')

const pool = new Pool({ connectionString })

async function main() {
  console.log(`Seeding ${BIKE_LISTINGS.length} bikes...`)

  for (const bike of BIKE_LISTINGS) {
    await pool.query(
      `INSERT INTO bike_listings (id, brand, model, category, price, travel, "wheelSize", frame, description, "affiliateUrl", active, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         brand        = EXCLUDED.brand,
         model        = EXCLUDED.model,
         category     = EXCLUDED.category,
         price        = EXCLUDED.price,
         travel       = EXCLUDED.travel,
         "wheelSize"  = EXCLUDED."wheelSize",
         frame        = EXCLUDED.frame,
         description  = EXCLUDED.description,
         "affiliateUrl" = EXCLUDED."affiliateUrl",
         "updatedAt"  = NOW()`,
      [bike.id, bike.brand, bike.model, bike.category, bike.price,
       bike.travel, bike.wheelSize, bike.frame, bike.description, bike.affiliateUrl]
    )
    console.log(`  ✓ ${bike.brand} ${bike.model}`)
  }

  console.log(`\n✅ Seeded ${BIKE_LISTINGS.length} bikes.`)
  await pool.end()
}

main().catch((err) => { console.error(err); process.exit(1) })
