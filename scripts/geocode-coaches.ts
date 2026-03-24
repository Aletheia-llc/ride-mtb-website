#!/usr/bin/env npx tsx
// ── Batch Geocode Coach Profiles ─────────────────────────────
// Usage: MAPBOX_ACCESS_TOKEN=xxx DATABASE_URL=xxx npx tsx scripts/geocode-coaches.ts
//
// Geocodes all CoachProfile records that have a non-null location
// but null latitude/longitude. Calls Mapbox Geocoding API.
// Safe to re-run: only processes records missing coordinates.

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

// ── DB Client ────────────────────────────────────────────────

function createDb(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DATABASE_POOLED_URL
  if (!connectionString) {
    console.error(
      'Error: DATABASE_URL or DATABASE_POOLED_URL must be set in .env',
    )
    process.exit(1)
  }

  const pool = new Pool({ connectionString, max: 2 })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const token = process.env.MAPBOX_ACCESS_TOKEN
  if (!token) {
    console.error(
      'Error: MAPBOX_ACCESS_TOKEN must be set in .env or environment',
    )
    process.exit(1)
  }

  const db = createDb()

  let geocoded = 0
  let skipped = 0
  let errors = 0

  try {
    const profiles = await db.coachProfile.findMany({
      where: {
        location: { not: null },
        latitude: null,
      },
      include: {
        user: { select: { name: true } },
      },
    })

    console.log(`Found ${profiles.length} coach profile(s) to geocode.`)

    for (const profile of profiles) {
      const name = profile.user.name ?? profile.id
      const location = profile.location as string

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${token}&limit=1`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = (await response.json()) as {
          features: Array<{ center: [number, number] }>
        }

        const center = data.features[0]?.center

        if (center) {
          const [longitude, latitude] = center

          await db.coachProfile.update({
            where: { id: profile.id },
            data: { latitude, longitude },
          })

          console.log(`[geocode] ${name}: ${latitude}, ${longitude}`)
          geocoded++
        } else {
          console.log(`[geocode] ${name}: no result, skipping`)
          skipped++
        }
      } catch (err) {
        console.error(
          `[geocode] ${name}: error — ${err instanceof Error ? err.message : String(err)}`,
        )
        errors++
      }

      await sleep(100)
    }
  } finally {
    await db.$disconnect()
  }

  console.log(
    `Done: ${geocoded} geocoded, ${skipped} skipped, ${errors} errors`,
  )
}

main()
