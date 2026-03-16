/**
 * Data migration: standalone Docker DBs → Supabase monolith
 *
 * Run: node scripts/migrate-standalone-data.mjs
 */

import pg from 'pg'
import fs from 'fs'

const { Pool } = pg

function getPassword() {
  const raw = fs.readFileSync('.env.local', 'utf8')
  const m = raw.match(/DATABASE_PASSWORD=([^\n]+)/)
  return m ? m[1].replace(/^"|"$/g, '').trim() : null
}

const SUPABASE = new Pool({
  host: 'aws-1-us-west-1.pooler.supabase.com',
  user: 'postgres.ulvnbvmtzzqruaaozhrr',
  password: getPassword(),
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
  max: 3,
})

const TRAIL_MAPS = new Pool({ host: 'localhost', port: 5444, user: 'postgres', password: 'postgres', database: 'ride_mtb_trail_maps' })
const LEARN      = new Pool({ host: 'localhost', port: 5434, user: 'postgres', password: 'postgres', database: 'ridemtb_learn' })
const SHOPS_DB   = new Pool({ host: 'localhost', port: 5442, user: 'postgres', password: 'postgres', database: 'ridemtb_shops' })

// ── Enum mappings ────────────────────────────────────────────────────────────

const TRAIL_TYPE_MAP = {
  cross_country: 'xc', flow_trail: 'flow',
  downhill: 'downhill', enduro: 'enduro', freeride: 'freeride',
  connector: 'connector', out_and_back: 'out_and_back', loop: 'loop',
  xc: 'xc', flow: 'flow',
}

const SHOP_TYPE_MAP = {
  bike_shop: 'LOCAL_SHOP', wheel_builder: 'WHEEL_BUILDER',
  suspension_service: 'SUSPENSION_SPECIALIST', online_retailer: 'ONLINE_RETAILER',
  trail_center: 'DEMO_CENTER', service_center: 'REPAIR_ONLY',
  bike_park: 'DEMO_CENTER', shuttle_service: 'GUIDE_SERVICE',
  mobile_mechanic: 'REPAIR_ONLY',
}

const PARTNER_TIER_MAP = { none: 'NONE', verified: 'VERIFIED', partner: 'PARTNER', premier: 'PREMIER' }

function log(msg) { console.log(`[migrate] ${msg}`) }

// ── 1. Trail Systems ─────────────────────────────────────────────────────────

async function migrateTrailSystems() {
  log('migrating trail_systems...')
  const { rows } = await TRAIL_MAPS.query(`
    SELECT id, slug, name, description, system_type, city, state, country,
           latitude, longitude, website_url, trail_count, total_miles, status, created_at, updated_at
    FROM trail_systems ORDER BY created_at
  `)

  let count = 0
  for (const r of rows) {
    const status = r.status === 'active' ? 'open' : (r.status ?? 'open')
    await SUPABASE.query(`
      INSERT INTO trail_systems
        (id, slug, name, description, "systemType", city, state, country,
         latitude, longitude, "websiteUrl", "trailCount", "totalMiles", status, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (slug) DO UPDATE SET
        name=EXCLUDED.name, description=EXCLUDED.description,
        city=EXCLUDED.city, state=EXCLUDED.state,
        latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
        "websiteUrl"=EXCLUDED."websiteUrl",
        "trailCount"=EXCLUDED."trailCount", "totalMiles"=EXCLUDED."totalMiles",
        "updatedAt"=EXCLUDED."updatedAt"
    `, [
      r.id, r.slug, r.name, r.description, r.system_type,
      r.city, r.state, r.country ?? 'US',
      r.latitude, r.longitude, r.website_url,
      r.trail_count ?? 0, r.total_miles ?? 0, status,
      r.created_at, r.updated_at,
    ])
    count++
  }
  log(`  ✓ ${count} trail_systems`)
  return count
}

// ── 2. Trails ────────────────────────────────────────────────────────────────

async function migrateTrails() {
  log('migrating trails (2,284 rows — this takes a moment)...')
  const { rows } = await TRAIL_MAPS.query(`
    SELECT id, trail_system_id, slug, name, description, trail_type,
           physical_difficulty, technical_difficulty,
           distance_miles, elevation_gain_ft, elevation_loss_ft,
           high_point_ft, low_point_ft, status, created_at, updated_at
    FROM trails ORDER BY trail_system_id, created_at
  `)

  let count = 0
  for (const r of rows) {
    const trailType = TRAIL_TYPE_MAP[r.trail_type] ?? 'xc'
    const status = r.status ?? 'open'
    await SUPABASE.query(`
      INSERT INTO trails
        (id, "trailSystemId", slug, name, description, "trailType",
         "physicalDifficulty", "technicalDifficulty",
         distance, "elevationGain", "elevationLoss",
         "highPoint", "lowPoint", status, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (slug) DO UPDATE SET
        name=EXCLUDED.name, description=EXCLUDED.description,
        "physicalDifficulty"=EXCLUDED."physicalDifficulty",
        "technicalDifficulty"=EXCLUDED."technicalDifficulty",
        distance=EXCLUDED.distance,
        "elevationGain"=EXCLUDED."elevationGain",
        "elevationLoss"=EXCLUDED."elevationLoss",
        "updatedAt"=EXCLUDED."updatedAt"
    `, [
      r.id, r.trail_system_id, r.slug, r.name, r.description, trailType,
      r.physical_difficulty ?? 1, r.technical_difficulty ?? 1,
      r.distance_miles, r.elevation_gain_ft, r.elevation_loss_ft,
      r.high_point_ft, r.low_point_ft, status,
      r.created_at, r.updated_at,
    ])
    count++
    if (count % 200 === 0) process.stdout.write(`\r  trails: ${count}/${rows.length}`)
  }
  console.log(`\r  trails: ${count}/${rows.length}`)
  log(`  ✓ ${count} trails`)
  return count
}

// ── 3. Learn Courses ─────────────────────────────────────────────────────────

async function migrateLearnCourses() {
  log('migrating learn_courses...')
  const { rows } = await LEARN.query(`
    SELECT id, slug, title, description, thumbnail_url,
           difficulty, category, sort_order, status, created_at, updated_at
    FROM courses ORDER BY sort_order, created_at
  `)

  let count = 0
  for (const r of rows) {
    await SUPABASE.query(`
      INSERT INTO learn_courses
        (id, slug, title, description, "thumbnailUrl",
         difficulty, category, "sortOrder", status, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (slug) DO UPDATE SET
        title=EXCLUDED.title, description=EXCLUDED.description,
        "thumbnailUrl"=EXCLUDED."thumbnailUrl", status=EXCLUDED.status,
        "sortOrder"=EXCLUDED."sortOrder", "updatedAt"=EXCLUDED."updatedAt"
    `, [
      r.id, r.slug, r.title, r.description, r.thumbnail_url,
      r.difficulty, r.category, r.sort_order ?? 0, r.status,
      r.created_at, r.updated_at,
    ])
    count++
  }
  log(`  ✓ ${count} learn_courses`)
  return count
}

// ── 4. Learn Modules ─────────────────────────────────────────────────────────

async function migrateLearnModules() {
  log('migrating learn_modules...')
  const { rows } = await LEARN.query(`
    SELECT id, course_id, slug, title, sort_order,
           lesson_content, youtube_video_id, status, created_at, updated_at
    FROM modules ORDER BY course_id, sort_order
  `)

  let count = 0
  for (const r of rows) {
    await SUPABASE.query(`
      INSERT INTO learn_modules
        (id, "courseId", slug, title, "sortOrder",
         "lessonContent", "youtubeVideoId", status, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT ("courseId", slug) DO UPDATE SET
        title=EXCLUDED.title, "sortOrder"=EXCLUDED."sortOrder",
        "lessonContent"=EXCLUDED."lessonContent",
        "youtubeVideoId"=EXCLUDED."youtubeVideoId",
        status=EXCLUDED.status, "updatedAt"=EXCLUDED."updatedAt"
    `, [
      r.id, r.course_id, r.slug, r.title, r.sort_order ?? 0,
      r.lesson_content ? JSON.stringify(r.lesson_content) : null,
      r.youtube_video_id, r.status, r.created_at, r.updated_at,
    ])
    count++
  }
  log(`  ✓ ${count} learn_modules`)
  return count
}

// ── 5. Learn Quizzes ─────────────────────────────────────────────────────────

async function migrateLearnQuizzes() {
  log('migrating learn_quizzes...')
  const { rows } = await LEARN.query(`
    SELECT id, module_id, slug, title, description,
           difficulty, category, status, created_at, updated_at
    FROM quizzes ORDER BY created_at
  `)

  let count = 0
  for (const r of rows) {
    await SUPABASE.query(`
      INSERT INTO learn_quizzes
        (id, "moduleId", slug, title, description,
         difficulty, category, status, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (slug) DO UPDATE SET
        title=EXCLUDED.title, description=EXCLUDED.description,
        status=EXCLUDED.status, "updatedAt"=EXCLUDED."updatedAt"
    `, [
      r.id, r.module_id, r.slug, r.title, r.description,
      r.difficulty, r.category, r.status, r.created_at, r.updated_at,
    ])
    count++
  }
  log(`  ✓ ${count} learn_quizzes`)
  return count
}

// ── 6. Shops ─────────────────────────────────────────────────────────────────

async function migrateShops() {
  log('migrating shops...')
  const { rows } = await SHOPS_DB.query(`
    SELECT id, slug, name, description, shop_type, phone, email,
           website_url, address, address2, city, state, zip_code, country,
           latitude, longitude, services, brands, hours_json, partner_tier,
           average_rating, review_count,
           avg_service_rating, avg_pricing_rating, avg_selection_rating,
           created_at, updated_at
    FROM shops ORDER BY name
  `)

  let count = 0
  for (const r of rows) {
    const shopType    = SHOP_TYPE_MAP[r.shop_type] ?? 'LOCAL_SHOP'
    const partnerTier = PARTNER_TIER_MAP[r.partner_tier] ?? 'NONE'
    const address     = [r.address, r.address2].filter(Boolean).join(', ')
    await SUPABASE.query(`
      INSERT INTO shops
        (id, slug, name, description, "shopType", "partnerTier",
         phone, email, "websiteUrl",
         address, city, state, "zipCode", country,
         latitude, longitude, services, brands, "hoursJson",
         "avgOverallRating", "avgServiceRating", "avgPricingRating", "avgSelectionRating",
         "reviewCount", "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      ON CONFLICT (slug) DO UPDATE SET
        name=EXCLUDED.name, description=EXCLUDED.description,
        phone=EXCLUDED.phone, email=EXCLUDED.email, "websiteUrl"=EXCLUDED."websiteUrl",
        latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
        services=EXCLUDED.services, brands=EXCLUDED.brands,
        "updatedAt"=EXCLUDED."updatedAt"
    `, [
      r.id, r.slug, r.name, r.description, shopType, partnerTier,
      r.phone, r.email, r.website_url,
      address, r.city, r.state, r.zip_code, r.country ?? 'US',
      r.latitude, r.longitude,
      JSON.stringify(r.services ?? []),
      JSON.stringify(r.brands ?? []),
      r.hours_json ? JSON.stringify(r.hours_json) : null,
      r.average_rating, r.avg_service_rating, r.avg_pricing_rating, r.avg_selection_rating,
      r.review_count ?? 0, r.created_at, r.updated_at,
    ])
    count++
  }
  log(`  ✓ ${count} shops`)
  return count
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('clearing existing monolith data...')
  await SUPABASE.query('DELETE FROM trails')
  await SUPABASE.query('DELETE FROM trail_systems')
  await SUPABASE.query('DELETE FROM learn_quizzes')
  await SUPABASE.query('DELETE FROM learn_modules')
  await SUPABASE.query('DELETE FROM learn_courses')
  await SUPABASE.query('DELETE FROM shops')
  log('  done\n')

  const results = {}
  results.trailSystems = await migrateTrailSystems()
  results.trails       = await migrateTrails()
  results.learnCourses = await migrateLearnCourses()
  results.learnModules = await migrateLearnModules()
  results.learnQuizzes = await migrateLearnQuizzes()
  results.shops        = await migrateShops()

  log('\n✅ Migration complete:')
  for (const [k, v] of Object.entries(results)) log(`   ${k}: ${v} rows`)

  await Promise.all([SUPABASE.end(), TRAIL_MAPS.end(), LEARN.end(), SHOPS_DB.end()])
}

main().catch((err) => { console.error('Migration failed:', err.message); process.exit(1) })
