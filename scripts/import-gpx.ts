#!/usr/bin/env npx tsx
// ── Bulk GPX Import Script ───────────────────────────────────
// Usage: npx tsx scripts/import-gpx.ts <system-id> <gpx-file-or-directory>
//
// For each .gpx file:
//   1. Parse to GPS points
//   2. Calculate trail stats (distance, elevation, bounds)
//   3. Simplify track to max 500 points
//   4. Generate slug from filename
//   5. Insert Trail + TrailGpsTrack records
//   6. Update system trailCount and totalMiles

import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import {
  parseGpxToPoints,
  calculateTrailStats,
  simplifyTrack,
} from '../src/modules/trails/lib/gpx-processor'

// ── DB Client ────────────────────────────────────────────────

function createDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_POOLED_URL
  if (!connectionString) {
    console.error('Error: DATABASE_URL or DATABASE_POOLED_URL must be set in .env')
    process.exit(1)
  }

  const pool = new Pool({ connectionString, max: 2 })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// ── Helpers ──────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.gpx$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

function trailNameFromFilename(filename: string): string {
  return filename
    .replace(/\.gpx$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

// ── Process a single GPX file ────────────────────────────────

async function processGpxFile(
  db: PrismaClient,
  systemId: string,
  filePath: string,
): Promise<{ success: boolean; name: string; distance: number }> {
  const filename = path.basename(filePath)
  const trailName = trailNameFromFilename(filename)
  const slug = slugify(filename)

  console.log(`  Processing: ${filename}`)

  // Read and parse GPX
  const gpxContent = fs.readFileSync(filePath, 'utf-8')
  const points = parseGpxToPoints(gpxContent)

  if (points.length === 0) {
    console.log(`    SKIP: No trackpoints found in ${filename}`)
    return { success: false, name: trailName, distance: 0 }
  }

  console.log(`    Parsed ${points.length} trackpoints`)

  // Calculate stats
  const stats = calculateTrailStats(points)
  console.log(
    `    Stats: ${stats.distance}mi, +${stats.elevationGain}ft / -${stats.elevationLoss}ft`,
  )

  // Simplify track
  const simplified = simplifyTrack(points, 500)
  console.log(
    `    Simplified: ${points.length} -> ${simplified.length} points`,
  )

  // Check for existing trail with this slug
  const existing = await db.trail.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (existing) {
    console.log(`    SKIP: Trail with slug "${slug}" already exists`)
    return { success: false, name: trailName, distance: 0 }
  }

  // Insert trail + GPS track in a transaction
  await db.$transaction(async (tx) => {
    const trail = await tx.trail.create({
      data: {
        trailSystemId: systemId,
        name: trailName,
        slug,
        distance: stats.distance,
        elevationGain: stats.elevationGain,
        elevationLoss: stats.elevationLoss,
        highPoint: stats.highPoint,
        lowPoint: stats.lowPoint,
        status: 'open',
      },
    })

    await tx.trailGpsTrack.create({
      data: {
        trailId: trail.id,
        trackData: JSON.stringify(simplified),
        pointCount: simplified.length,
        boundsNeLat: stats.bounds.neLat,
        boundsNeLng: stats.bounds.neLng,
        boundsSwLat: stats.bounds.swLat,
        boundsSwLng: stats.bounds.swLng,
      },
    })
  })

  console.log(`    OK: Created trail "${trailName}" (${slug})`)
  return { success: true, name: trailName, distance: stats.distance }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const [systemId, targetPath] = process.argv.slice(2)

  if (!systemId || !targetPath) {
    console.error(
      'Usage: npx tsx scripts/import-gpx.ts <system-id> <gpx-file-or-directory>',
    )
    process.exit(1)
  }

  const db = createDb()

  // Verify system exists
  const system = await db.trailSystem.findUnique({
    where: { id: systemId },
    select: { id: true, name: true, trailCount: true, totalMiles: true },
  })

  if (!system) {
    console.error(`Error: Trail system "${systemId}" not found`)
    process.exit(1)
  }

  console.log(`\nImporting GPX files into system: ${system.name}`)
  console.log('─'.repeat(50))

  // Collect GPX files
  const resolvedPath = path.resolve(targetPath)
  let gpxFiles: string[] = []

  const stat = fs.statSync(resolvedPath)
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(resolvedPath)
    gpxFiles = entries
      .filter((f) => f.toLowerCase().endsWith('.gpx'))
      .sort()
      .map((f) => path.join(resolvedPath, f))
    console.log(`Found ${gpxFiles.length} GPX files in ${resolvedPath}\n`)
  } else if (stat.isFile()) {
    gpxFiles = [resolvedPath]
  } else {
    console.error(`Error: ${resolvedPath} is not a file or directory`)
    process.exit(1)
  }

  if (gpxFiles.length === 0) {
    console.error('No GPX files found')
    process.exit(1)
  }

  // Process each file
  let successCount = 0
  let totalNewMiles = 0

  for (const filePath of gpxFiles) {
    try {
      const result = await processGpxFile(db, systemId, filePath)
      if (result.success) {
        successCount++
        totalNewMiles += result.distance
      }
    } catch (err) {
      const filename = path.basename(filePath)
      console.error(`    ERROR processing ${filename}:`, err)
    }
  }

  // Update system aggregates
  if (successCount > 0) {
    await db.trailSystem.update({
      where: { id: systemId },
      data: {
        trailCount: system.trailCount + successCount,
        totalMiles:
          Math.round((system.totalMiles + totalNewMiles) * 100) / 100,
      },
    })
  }

  // Summary
  console.log('\n' + '─'.repeat(50))
  console.log(`Done! ${successCount}/${gpxFiles.length} files imported`)
  console.log(
    `  New trails: ${successCount}, New miles: ${Math.round(totalNewMiles * 100) / 100}`,
  )
  console.log(
    `  System totals: ${system.trailCount + successCount} trails, ${Math.round((system.totalMiles + totalNewMiles) * 100) / 100} miles`,
  )

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
