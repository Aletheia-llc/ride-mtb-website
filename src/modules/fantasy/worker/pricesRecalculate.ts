// src/modules/fantasy/worker/pricesRecalculate.ts
import { pool } from '@/lib/db/client'
import { redis } from '@/lib/redis'
import { computeMarketPrice } from '../lib/pricing'

export type PriceSnapshot = Record<string, { cents: number; prev: number | null }>

export async function handlePricesRecalculate(payload: { eventId: string }) {
  const { eventId } = payload
  const client = await pool.connect()
  try {
    // 1. Load event + series metadata
    const eventRes = await client.query(
      `SELECT e.id, e."seriesId", s."sensitivityFactor", s.season
       FROM fantasy_events e
       JOIN fantasy_series s ON s.id = e."seriesId"
       WHERE e.id = $1`,
      [eventId]
    )
    if (eventRes.rows.length === 0) {
      console.error(`[fantasy.prices.recalculate] Event ${eventId} not found`)
      return
    }
    const { seriesId, sensitivityFactor, season } = eventRes.rows[0]

    // 2. Count total teams in this series+season
    const teamCountRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM fantasy_teams
       WHERE "seriesId" = $1 AND season = $2`,
      [seriesId, season]
    )
    const teamCount: number = teamCountRes.rows[0].count

    // 3. Load all rider entries for this event
    const entriesRes = await client.query(
      `SELECT "riderId", "basePriceCents"
       FROM rider_event_entries
       WHERE "eventId" = $1`,
      [eventId]
    )
    const entries: Array<{ riderId: string; basePriceCents: number }> = entriesRes.rows

    // 4. Count picks per rider for this event (all picks, locked or not)
    const picksRes = await client.query(
      `SELECT "riderId", COUNT(*)::int AS count
       FROM fantasy_picks
       WHERE "eventId" = $1
       GROUP BY "riderId"`,
      [eventId]
    )
    const picksMap: Record<string, number> = {}
    for (const row of picksRes.rows) {
      picksMap[row.riderId] = row.count
    }

    // 5. Read existing Redis snapshot to preserve prev prices
    const redisKey = `fantasy:prices:${eventId}`
    const existingRaw = await redis.get<string>(redisKey)
    let existing: PriceSnapshot = {}
    if (existingRaw) {
      try {
        existing = typeof existingRaw === 'string'
          ? JSON.parse(existingRaw)
          : existingRaw as PriceSnapshot
      } catch {
        existing = {}
      }
    }

    // 6. Compute new prices
    const newSnapshot: PriceSnapshot = {}
    const updates: Array<{ riderId: string; cents: number }> = []

    for (const entry of entries) {
      const teamsWithRider = picksMap[entry.riderId] ?? 0
      const cents = computeMarketPrice({
        basePriceCents: entry.basePriceCents,
        teamCount,
        teamsWithRider,
        sensitivityFactor,
      })
      const prev = existing[entry.riderId]?.cents ?? null
      newSnapshot[entry.riderId] = { cents, prev }
      updates.push({ riderId: entry.riderId, cents })
    }

    // 7. Write to Redis (no TTL — persists until next recalculate)
    await redis.set(redisKey, JSON.stringify(newSnapshot))

    // 8. Bulk update Postgres marketPriceCents
    for (const update of updates) {
      await client.query(
        `UPDATE rider_event_entries
         SET "marketPriceCents" = $1
         WHERE "eventId" = $2 AND "riderId" = $3`,
        [update.cents, eventId, update.riderId]
      )
    }

    console.log(
      `[fantasy.prices.recalculate] Event ${eventId}: updated ${updates.length} rider prices`
    )
  } finally {
    client.release()
  }
}
