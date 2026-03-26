// src/modules/fantasy/worker/mulliganAutoPick.ts
// Called by pg-boss worker as 'fantasy.mulligan.auto-pick'
// Input: { teamId: string; eventId: string; userId: string }
//
// Auto-picks the previous event's team for a user who missed the roster deadline
// but has an unspent mulligan. The entire operation is transactional with
// SELECT FOR UPDATE to prevent double-use of a single mulligan charge.

import { pool } from '@/lib/db/client'
import { WILDCARD_PRICE_THRESHOLD } from '../constants/scoring'

export interface MulliganAutoPickPayload {
  teamId: string
  eventId: string
  userId: string
}

export async function handleMulliganAutoPick(payload: MulliganAutoPickPayload) {
  const { teamId, eventId, userId } = payload
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Lock the team row to prevent concurrent mulligan jobs
    const teamRes = await client.query(
      `SELECT ft.id, ft."seriesId"
       FROM fantasy_teams ft
       WHERE ft.id = $1
       FOR UPDATE`,
      [teamId]
    )
    if (teamRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(`[fantasy.mulligan.auto-pick] Team ${teamId} not found`)
      return
    }
    const { seriesId } = teamRes.rows[0] as { seriesId: string }

    // 2. Verify this event still has zero picks (idempotent — job may fire late/duplicate)
    const existingPicksRes = await client.query(
      `SELECT id FROM fantasy_picks WHERE "teamId" = $1 AND "eventId" = $2 LIMIT 1`,
      [teamId, eventId]
    )
    if (existingPicksRes.rows.length > 0) {
      await client.query('ROLLBACK')
      console.info(
        `[fantasy.mulligan.auto-pick] Team ${teamId} already has picks for event ${eventId} — skipping`
      )
      return
    }

    // 3. Lock mulligan balance row + check available balance
    const balanceRes = await client.query(
      `SELECT id, "totalPurchased", "totalUsed"
       FROM mulligan_balances
       WHERE "userId" = $1
       FOR UPDATE`,
      [userId]
    )
    if (balanceRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(`[fantasy.mulligan.auto-pick] No mulligan balance for user ${userId}`)
      return
    }
    const balance = balanceRes.rows[0] as {
      id: string
      totalPurchased: number
      totalUsed: number
    }
    const available = balance.totalPurchased - balance.totalUsed
    if (available <= 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] User ${userId} has no mulligan balance (purchased=${balance.totalPurchased} used=${balance.totalUsed})`
      )
      return
    }

    // 4. Check no MulliganUse record already exists for this team+event (idempotent)
    const mulliganUseRes = await client.query(
      `SELECT id FROM mulligan_uses WHERE "teamId" = $1 AND "eventId" = $2 LIMIT 1`,
      [teamId, eventId]
    )
    if (mulliganUseRes.rows.length > 0) {
      await client.query('ROLLBACK')
      console.info(
        `[fantasy.mulligan.auto-pick] MulliganUse already exists for team ${teamId} event ${eventId} — skipping`
      )
      return
    }

    // 5. Find the previous scored event for this series
    //    "Previous" = most recent FantasyEvent with status = 'scored' and raceDate before
    //    this event's rosterDeadline. The spec requires status = 'scored' only.

    // Guard against NULL rosterDeadline
    const deadlineCheckRes = await client.query(
      `SELECT "rosterDeadline" FROM fantasy_events WHERE id = $1`,
      [eventId]
    )
    if (!deadlineCheckRes.rows[0]?.rosterDeadline) {
      await client.query('ROLLBACK')
      console.warn(`[fantasy.mulligan.auto-pick] Event ${eventId} has no rosterDeadline — cannot find prev event`)
      return
    }

    const prevEventRes = await client.query(
      `SELECT fe.id
       FROM fantasy_events fe
       WHERE fe."seriesId" = $1
         AND fe."raceDate" < (
           SELECT "rosterDeadline" FROM fantasy_events WHERE id = $2
         )
         AND fe.status = 'scored'
       ORDER BY fe."raceDate" DESC
       LIMIT 1`,
      [seriesId, eventId]
    )
    if (prevEventRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] No previous scored event found for series ${seriesId} before event ${eventId}`
      )
      return
    }
    const prevEventId: string = prevEventRes.rows[0].id

    // 6. Load previous event's locked picks for this team, including priceAtPick.
    //    Only picks with lockedAt IS NOT NULL (unlocked draft picks excluded).
    const prevPicksRes = await client.query(
      `SELECT fp."riderId", fp."isWildcard", fp."priceAtPick"
       FROM fantasy_picks fp
       WHERE fp."teamId" = $1
         AND fp."eventId" = $2
         AND fp."lockedAt" IS NOT NULL`,
      [teamId, prevEventId]
    )
    if (prevPicksRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] No locked picks found in previous event ${prevEventId} for team ${teamId}`
      )
      return
    }
    const prevPicks = prevPicksRes.rows as Array<{
      riderId: string
      isWildcard: boolean
      priceAtPick: number
    }>

    // 7. Check which previous riders are still entered in the current event.
    const riderIds = prevPicks.map(p => p.riderId)
    const currentEntriesRes = await client.query(
      `SELECT "riderId"
       FROM rider_event_entries
       WHERE "eventId" = $1 AND "riderId" = ANY($2::text[])`,
      [eventId, riderIds]
    )
    const enteredRiderIds = new Set<string>(currentEntriesRes.rows.map((r: { riderId: string }) => r.riderId))

    // 8. Load salary cap for this series
    const seriesRes = await client.query(
      `SELECT "salaryCap" FROM fantasy_series WHERE id = $1`,
      [seriesId]
    )
    const salaryCap: number = seriesRes.rows[0]?.salaryCap ?? 150_000_000

    // 9. Build picks using PREVIOUS priceAtPick values (not current market prices).
    //    isWildcard is re-derived from the previous priceAtPick using WILDCARD_PRICE_THRESHOLD.
    //    Enforce: max 6 picks, max 2 wildcards, salary cap.
    //    Skip ineligible riders — no substitution (deferred to a future phase).
    const picksToInsert: Array<{
      riderId: string
      isWildcard: boolean
      priceAtPick: number
    }> = []
    let totalCost = 0
    let wildcardCount = 0

    for (const prev of prevPicks) {
      if (!enteredRiderIds.has(prev.riderId)) {
        console.info(
          `[fantasy.mulligan.auto-pick] Rider ${prev.riderId} not entered in event ${eventId} — skipping`
        )
        continue
      }
      if (picksToInsert.length >= 6) break

      // Re-derive isWildcard from the previous priceAtPick (not current market price)
      const isWildcard = prev.priceAtPick < WILDCARD_PRICE_THRESHOLD
      if (isWildcard && wildcardCount >= 2) {
        console.info(
          `[fantasy.mulligan.auto-pick] Wildcard slots full — skipping rider ${prev.riderId}`
        )
        continue
      }

      // Budget check using previous priceAtPick (spec requirement)
      if (totalCost + prev.priceAtPick > salaryCap) {
        console.info(
          `[fantasy.mulligan.auto-pick] Budget exceeded at rider ${prev.riderId} (prev price ${prev.priceAtPick}) — skipping`
        )
        continue
      }

      picksToInsert.push({
        riderId: prev.riderId,
        isWildcard,
        priceAtPick: prev.priceAtPick,
      })
      totalCost += prev.priceAtPick
      if (isWildcard) wildcardCount++
    }

    if (picksToInsert.length === 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] No valid picks to replicate for team ${teamId} event ${eventId}`
      )
      return
    }

    // 10. Insert picks — locked immediately (mulligan picks lock at current time)
    const lockedAt = new Date()
    for (const pick of picksToInsert) {
      await client.query(
        `INSERT INTO fantasy_picks
           (id, "teamId", "eventId", "riderId", "isWildcard", "priceAtPick", "lockedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         ON CONFLICT ("teamId", "eventId", "riderId") DO NOTHING`,
        [teamId, eventId, pick.riderId, pick.isWildcard, pick.priceAtPick, lockedAt]
      )
    }

    // 10b. Verify at least one pick was actually inserted
    const actualPicksRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM fantasy_picks
       WHERE "teamId" = $1 AND "eventId" = $2`,
      [teamId, eventId]
    )
    const actualCount: number = actualPicksRes.rows[0].count
    if (actualCount === 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] All picks were conflicts — no picks inserted for team ${teamId} event ${eventId}`
      )
      return
    }

    // 11. Increment MulliganBalance.totalUsed
    await client.query(
      `UPDATE mulligan_balances SET "totalUsed" = "totalUsed" + 1 WHERE id = $1`,
      [balance.id]
    )

    // 12. Record MulliganUse
    await client.query(
      `INSERT INTO mulligan_uses (id, "userId", "teamId", "eventId", "usedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       ON CONFLICT ("teamId", "eventId") DO NOTHING`,
      [userId, teamId, eventId]
    )

    await client.query('COMMIT')

    console.info(
      `[fantasy.mulligan.auto-pick] Auto-picked ${picksToInsert.length} riders for team ${teamId} event ${eventId} (mulligan used)`
    )
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[fantasy.mulligan.auto-pick] Error:', err)
    throw err // Re-throw so pg-boss retries
  } finally {
    client.release()
  }
}
