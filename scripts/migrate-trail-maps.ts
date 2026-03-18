#!/usr/bin/env npx tsx
// scripts/migrate-trail-maps.ts
//
// Migrates trail data from standalone Docker DB → monolith Supabase
// Source: postgresql://postgres:postgres@localhost:5444/ride_mtb_trail_maps
// Target: DATABASE_DIRECT_URL in .env.local
//
// Usage: npx tsx scripts/migrate-trail-maps.ts

import { config } from 'dotenv'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

config({ path: '.env.local' })

// ── Source (standalone Docker) ───────────────────────────────
const srcPool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5444/ride_mtb_trail_maps',
  max: 3,
})

// ── Target (monolith Supabase) ───────────────────────────────
const tgtPool = new Pool({
  connectionString: process.env.DATABASE_DIRECT_URL,
  max: 3,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(tgtPool)
const db = new PrismaClient({ adapter })

// ── Helpers ──────────────────────────────────────────────────
function float(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function log(msg: string) { process.stdout.write(msg + '\n') }

// Map standalone trail_type values to monolith TrailType enum
const TRAIL_TYPE_MAP: Record<string, string> = {
  cross_country: 'xc',
  flow_trail: 'flow',
  // these already match:
  downhill: 'downhill',
  enduro: 'enduro',
  freeride: 'freeride',
  connector: 'connector',
  out_and_back: 'out_and_back',
  loop: 'loop',
}

function mapTrailType(v: string | null): string {
  if (!v) return 'xc'
  return TRAIL_TYPE_MAP[v] ?? 'other'
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  log('Starting trail maps migration...\n')

  // 1. Regions
  log('Migrating regions...')
  const { rows: regions } = await srcPool.query('SELECT * FROM regions ORDER BY created_at')
  const regionMap: Record<string, string> = {}
  for (const r of regions) {
    const existing = await db.trailRegion.findFirst({ where: { slug: r.slug } })
    const data = {
      name: r.name,
      slug: r.slug,
      description: r.description ?? undefined,
      state: r.state ?? undefined,
      country: r.country ?? 'US',
      coverImageUrl: r.cover_image_url ?? undefined,
      boundsNeLat: float(r.bounds_ne_lat) ?? undefined,
      boundsNeLng: float(r.bounds_ne_lng) ?? undefined,
      boundsSwLat: float(r.bounds_sw_lat) ?? undefined,
      boundsSwLng: float(r.bounds_sw_lng) ?? undefined,
      trailSystemCount: r.trail_system_count ?? 0,
      totalTrailCount: r.total_trail_count ?? 0,
    }
    const tgt = existing
      ? await db.trailRegion.update({ where: { id: existing.id }, data })
      : await db.trailRegion.create({ data })
    regionMap[r.id] = tgt.id
  }
  log(`  ✓ ${regions.length} regions`)

  // 2. Trail Systems
  log('Migrating trail systems...')
  const { rows: systems } = await srcPool.query('SELECT * FROM trail_systems ORDER BY created_at')
  const systemMap: Record<string, string> = {}
  for (const s of systems) {
    const existing = await db.trailSystem.findFirst({ where: { slug: s.slug } })
    const data = {
      name: s.name,
      slug: s.slug,
      description: s.description ?? undefined,
      coverImageUrl: s.cover_image_url ?? undefined,
      city: s.city ?? undefined,
      state: s.state ?? undefined,
      country: s.country ?? 'US',
      latitude: float(s.latitude) ?? undefined,
      longitude: float(s.longitude) ?? undefined,
      trailheadLat: float(s.trailhead_lat) ?? undefined,
      trailheadLng: float(s.trailhead_lng) ?? undefined,
      trailheadNotes: s.trailhead_notes ?? undefined,
      parkingInfo: s.parking_info ?? undefined,
      seasonalNotes: s.seasonal_notes ?? undefined,
      websiteUrl: s.website_url ?? undefined,
      phone: s.phone ?? undefined,
      systemType: s.system_type ?? 'trail_network',
      status: s.status === 'active' ? 'open' : (s.status ?? 'open'),
      // pass_required in standalone is text (e.g. "yes", "Sno-Park Permit required") — coerce to Boolean
      passRequired: !!s.pass_required,
      dogFriendly: s.dog_friendly ?? true,
      eMtbAllowed: s.emtb_allowed ?? true,
      isFeatured: s.is_featured ?? false,
      totalMiles: float(s.total_miles) ?? 0,
      totalVertFt: float(s.total_vert_ft) ?? 0,
      trailCount: s.trail_count ?? 0,
      averageRating: float(s.average_rating) ?? undefined,
      reviewCount: s.review_count ?? 0,
      rideCount: s.ride_count ?? 0,
      importSource: s.import_source ?? undefined,
      externalId: s.external_id ?? undefined,
      regionId: s.region_id ? regionMap[s.region_id] : undefined,
    }
    const tgt = existing
      ? await db.trailSystem.update({ where: { id: existing.id }, data })
      : await db.trailSystem.create({ data })
    systemMap[s.id] = tgt.id
  }
  log(`  ✓ ${systems.length} trail systems`)

  // 3. Trails
  log('Migrating trails...')
  const { rows: trails } = await srcPool.query('SELECT * FROM trails ORDER BY created_at')
  const trailMap: Record<string, string> = {}
  let trailCount = 0
  let trailSkipped = 0
  for (const t of trails) {
    const systemId = systemMap[t.trail_system_id]
    if (!systemId) { trailSkipped++; continue }
    try {
      const existing = await db.trail.findFirst({ where: { slug: t.slug } })
      const data = {
        name: t.name,
        slug: t.slug,
        description: t.description ?? undefined,
        trailSystemId: systemId,
        trailType: mapTrailType(t.trail_type),
        physicalDifficulty: t.physical_difficulty ?? 1,
        technicalDifficulty: t.technical_difficulty ?? 1,
        difficultyLabel: t.difficulty_label ?? undefined,
        distance: float(t.distance_miles) ?? undefined,
        elevationGain: float(t.elevation_gain_ft) ?? undefined,
        elevationLoss: float(t.elevation_loss_ft) ?? undefined,
        highPoint: float(t.high_point_ft) ?? undefined,
        lowPoint: float(t.low_point_ft) ?? undefined,
        hasGpsTrack: t.has_gps_track ?? false,
        features: t.features ?? [],
        surfaceType: t.surface_type ?? undefined,
        direction: t.direction ?? undefined,
        status: t.status ?? 'open',
        // current_condition in standalone is free-text (e.g. "Dry and fast") — not a valid ConditionType enum value; skip it
        // currentCondition: t.current_condition ?? undefined,
        averageRating: float(t.average_rating) ?? undefined,
        reviewCount: t.review_count ?? 0,
        rideCount: t.ride_count ?? 0,
        importSource: t.import_source ?? undefined,
        externalId: t.external_id ?? undefined,
      }
      const tgt = existing
        ? await db.trail.update({ where: { id: existing.id }, data })
        : await db.trail.create({ data })
      trailMap[t.id] = tgt.id
      trailCount++
      if (trailCount % 200 === 0) process.stdout.write(`  ... ${trailCount}/${trails.length}\n`)
    } catch (err) {
      trailSkipped++
      log(`  SKIP trail "${t.name}" (${t.id}): ${(err as Error).message}`)
    }
  }
  log(`  ✓ ${trailCount} trails (${trailSkipped} skipped)`)

  // 4. GPS Tracks
  // IMPORTANT: standalone has bounds_json (text) not individual bounds columns.
  // Parse bounds_json to populate individual Float fields; also store raw as boundsJson.
  log('Migrating GPS tracks...')
  const { rows: tracks } = await srcPool.query('SELECT * FROM trail_gps_tracks ORDER BY created_at')
  let trackCount = 0
  let trackSkipped = 0
  for (const t of tracks) {
    const trailId = trailMap[t.trail_id]
    if (!trailId) { trackSkipped++; continue }
    try {
      const existing = await db.trailGpsTrack.findFirst({ where: { trailId } })

      // Parse bounds_json: {"ne":[lat,lng],"sw":[lat,lng]}
      let boundsNeLat: number | undefined, boundsNeLng: number | undefined
      let boundsSwLat: number | undefined, boundsSwLng: number | undefined
      if (t.bounds_json) {
        try {
          const b = JSON.parse(t.bounds_json) as { ne: [number, number]; sw: [number, number] }
          boundsNeLat = b.ne[0]; boundsNeLng = b.ne[1]
          boundsSwLat = b.sw[0]; boundsSwLng = b.sw[1]
        } catch { /* leave null */ }
      }

      const data = {
        trailId,
        trackData: t.track_data ?? undefined,
        elevationProfile: t.elevation_profile ?? undefined,
        boundsJson: t.bounds_json ?? undefined,
        boundsNeLat, boundsNeLng, boundsSwLat, boundsSwLng,
        contributorCount: t.contributor_count ?? 1,
        pointCount: 0,
      }
      if (existing) {
        await db.trailGpsTrack.update({ where: { id: existing.id }, data })
      } else {
        await db.trailGpsTrack.create({ data })
      }
      // Mark trail as hasGpsTrack
      await db.trail.update({ where: { id: trailId }, data: { hasGpsTrack: true } })
      trackCount++
      if (trackCount % 200 === 0) process.stdout.write(`  ... ${trackCount}/${tracks.length}\n`)
    } catch (err) {
      trackSkipped++
      log(`  SKIP track for trail_id ${t.trail_id}: ${(err as Error).message}`)
    }
  }
  log(`  ✓ ${trackCount} GPS tracks (${trackSkipped} skipped)`)

  // 5. Points of Interest (only approved)
  log('Migrating points of interest...')
  const { rows: pois } = await srcPool.query(
    'SELECT * FROM points_of_interest WHERE is_approved = true'
  )
  let poiCount = 0
  for (const p of pois) {
    const trailId = p.trail_id ? trailMap[p.trail_id] : undefined
    const trailSystemId = p.trail_system_id ? systemMap[p.trail_system_id] : undefined
    if (!trailId && !trailSystemId) continue
    const existing = trailId
      ? await db.pointOfInterest.findFirst({ where: { trailId, lat: float(p.latitude)!, lng: float(p.longitude)! } })
      : null
    if (!existing) {
      await db.pointOfInterest.create({
        data: {
          trailId: trailId ?? undefined,
          trailSystemId: trailSystemId ?? undefined,
          type: (p.poi_type ?? 'feature').toUpperCase() as 'TRAILHEAD' | 'PARKING' | 'WATER' | 'RESTROOM' | 'VIEWPOINT' | 'FEATURE' | 'HAZARD' | 'SHUTTLE_STOP',
          name: p.name,
          description: p.description ?? undefined,
          lat: float(p.latitude)!,
          lng: float(p.longitude)!,
          distanceAlongMi: float(p.distance_along_mi) ?? undefined,
          photoUrl: p.photo_url ?? undefined,
          isApproved: true,
        },
      })
      poiCount++
    }
  }
  log(`  ✓ ${poiCount} points of interest`)

  log('\n─────────────────────────────────')
  log('Migration complete:')
  log(`  ${regions.length} regions`)
  log(`  ${systems.length} trail systems`)
  log(`  ${trailCount} trails`)
  log(`  ${trackCount} GPS tracks`)
  log(`  ${poiCount} points of interest`)
  log('─────────────────────────────────')

  await db.$disconnect()
  await tgtPool.end()
  await srcPool.end()
}

main().catch((err) => { console.error(err); process.exit(1) })
