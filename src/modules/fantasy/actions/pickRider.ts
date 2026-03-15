// src/modules/fantasy/actions/pickRider.ts
'use server'

import { auth } from '@/lib/auth'
import { pool } from '@/lib/db/client'
import { getBoss } from '@/lib/pgboss'
import { WILDCARD_PRICE_THRESHOLD } from '../constants/scoring'

export interface PickRiderInput {
  seriesId: string
  season: number
  eventId: string
  riderId: string
}

export interface PickRiderResult {
  success: boolean
  error?: string
  teamId?: string
}

export async function pickRider(input: PickRiderInput): Promise<PickRiderResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  const userId = session.user.id

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Get or create the team
    const teamRes = await client.query(
      `INSERT INTO fantasy_teams (id, "userId", "seriesId", season)
       VALUES (gen_random_uuid(), $1, $2, $3)
       ON CONFLICT ("userId", "seriesId", season) DO UPDATE SET id = fantasy_teams.id
       RETURNING id`,
      [userId, input.seriesId, input.season]
    )
    const teamId = teamRes.rows[0].id

    // Lock the team row to prevent concurrent picks
    await client.query('SELECT id FROM fantasy_teams WHERE id = $1 FOR UPDATE', [teamId])

    // Count current picks for this event
    const picksRes = await client.query(
      `SELECT id, "riderId", "priceAtPick", "isWildcard"
       FROM fantasy_picks
       WHERE "teamId" = $1 AND "eventId" = $2 AND "lockedAt" IS NULL`,
      [teamId, input.eventId]
    )
    const currentPicks = picksRes.rows

    // Enforce 6-pick max
    if (currentPicks.length >= 6) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Team is full (6 riders max)' }
    }

    // Already picked this rider?
    if (currentPicks.some((p: { riderId: string }) => p.riderId === input.riderId)) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Rider already on your team' }
    }

    // Get current market price for the rider
    const entryRes = await client.query(
      `SELECT "marketPriceCents", "basePriceCents"
       FROM rider_event_entries
       WHERE "eventId" = $1 AND "riderId" = $2`,
      [input.eventId, input.riderId]
    )
    if (entryRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Rider not entered in this event' }
    }
    const { marketPriceCents } = entryRes.rows[0]

    // Verify event belongs to this series
    const eventCheckRes = await client.query(
      `SELECT "seriesId" FROM fantasy_events WHERE id = $1`,
      [input.eventId]
    )
    if (eventCheckRes.rows.length === 0 || eventCheckRes.rows[0].seriesId !== input.seriesId) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Event not in this series' }
    }

    // Derive isWildcard server-side (never trust client)
    const isWildcard = marketPriceCents < WILDCARD_PRICE_THRESHOLD

    // Enforce wildcard slot cap (max 2)
    if (isWildcard) {
      const wildcardCount = currentPicks.filter((p: { isWildcard: boolean }) => p.isWildcard).length
      if (wildcardCount >= 2) {
        await client.query('ROLLBACK')
        return { success: false, error: 'Wildcard slots full (2 max)' }
      }
    }

    // Get salary cap for this series
    const seriesRes = await client.query(
      `SELECT "salaryCap" FROM fantasy_series WHERE id = $1`,
      [input.seriesId]
    )
    if (seriesRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Series not found' }
    }
    const salaryCap: number = seriesRes.rows[0].salaryCap

    // Budget check
    const currentCost = currentPicks.reduce(
      (sum: number, p: { priceAtPick: number }) => sum + p.priceAtPick, 0
    )
    if (currentCost + marketPriceCents > salaryCap) {
      await client.query('ROLLBACK')
      return { success: false, error: `Over budget ($${((currentCost + marketPriceCents) / 100).toLocaleString()} of $${(salaryCap / 100).toLocaleString()})` }
    }

    // Insert pick
    await client.query(
      `INSERT INTO fantasy_picks (id, "teamId", "eventId", "riderId", "isWildcard", "priceAtPick")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       ON CONFLICT ("teamId", "eventId", "riderId") DO NOTHING`,
      [teamId, input.eventId, input.riderId, isWildcard, marketPriceCents]
    )

    await client.query('COMMIT')

    // Enqueue price recalculation (outside transaction)
    const boss = await getBoss()
    await boss.send('fantasy.prices.recalculate', { eventId: input.eventId }, { priority: 10 })

    return { success: true, teamId }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('pickRider error:', err)
    return { success: false, error: 'Failed to pick rider. Please try again.' }
  } finally {
    client.release()
  }
}
