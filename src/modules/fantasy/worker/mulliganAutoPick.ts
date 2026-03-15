// src/modules/fantasy/worker/mulliganAutoPick.ts
import { pool } from '@/lib/db/client'
import { getBoss } from '@/lib/pgboss'

export async function handleMulliganAutoPick(payload: {
  eventId: string
  userId: string
  teamId: string
}) {
  const { eventId, userId, teamId } = payload
  const client = await pool.connect()
  try {
    // 1. Load event + series metadata
    const eventRes = await client.query(
      `SELECT e."seriesId", s.season, s."salaryCap"
       FROM fantasy_events e
       JOIN fantasy_series s ON s.id = e."seriesId"
       WHERE e.id = $1`,
      [eventId]
    )
    if (eventRes.rows.length === 0) {
      console.error(`[mulligan.auto-pick] Event ${eventId} not found`)
      return
    }
    const { seriesId, season, salaryCap } = eventRes.rows[0]

    // 2. Check mulligan balance (pre-check before transaction)
    const balanceRes = await client.query(
      `SELECT "totalPurchased", "totalUsed" FROM mulligan_balances WHERE "userId" = $1`,
      [userId]
    )
    if (
      balanceRes.rows.length === 0 ||
      balanceRes.rows[0].totalPurchased - balanceRes.rows[0].totalUsed <= 0
    ) {
      console.log(`[mulligan.auto-pick] User ${userId} has no mulligan balance — skipping`)
      return
    }

    // 3. Find most recent scored event in same series
    const prevEventRes = await client.query(
      `SELECT id FROM fantasy_events
       WHERE "seriesId" = $1 AND status = 'scored'
       ORDER BY "raceDate" DESC
       LIMIT 1`,
      [seriesId]
    )
    if (prevEventRes.rows.length === 0) {
      console.log(`[mulligan.auto-pick] No prior scored event for series ${seriesId} — mulligan not consumed`)
      return
    }
    const prevEventId: string = prevEventRes.rows[0].id

    // 4. Load previous event's picks for this team (use their priceAtPick values)
    const prevPicksRes = await client.query(
      `SELECT "riderId", "isWildcard", "priceAtPick"
       FROM fantasy_picks
       WHERE "teamId" = $1 AND "eventId" = $2`,
      [teamId, prevEventId]
    )
    if (prevPicksRes.rows.length === 0) {
      console.log(`[mulligan.auto-pick] Team ${teamId} has no picks from prev event — skipping`)
      return
    }

    // 5. Get all rider entries for the new event (for substitution pool)
    const entriesRes = await client.query(
      `SELECT "riderId", "marketPriceCents",
              ("basePriceCents" < 20000000) AS "isWildcardEligible"
       FROM rider_event_entries
       WHERE "eventId" = $1
       ORDER BY "marketPriceCents" ASC`,
      [eventId]
    )
    const enteredRiderIds = new Set(entriesRes.rows.map((r: { riderId: string }) => r.riderId))
    const entriesByRider = Object.fromEntries(
      entriesRes.rows.map((r: { riderId: string; marketPriceCents: number; isWildcardEligible: boolean }) => [r.riderId, r])
    )

    // 6. Build final pick list
    // - Use previous priceAtPick for riders still in the event
    // - Substitute with cheapest eligible rider if not entered
    const finalPicks: Array<{ riderId: string; isWildcard: boolean; priceAtPick: number }> = []
    const usedRiderIds = new Set<string>()
    let wildcardCount = 0

    for (const prev of prevPicksRes.rows as Array<{ riderId: string; isWildcard: boolean; priceAtPick: number }>) {
      if (enteredRiderIds.has(prev.riderId) && !usedRiderIds.has(prev.riderId)) {
        // Rider is in new event — keep them at their previous priceAtPick
        const isWc = prev.isWildcard && wildcardCount < 2
        if (prev.isWildcard) wildcardCount++
        finalPicks.push({
          riderId: prev.riderId,
          isWildcard: isWc,
          priceAtPick: prev.priceAtPick,
        })
        usedRiderIds.add(prev.riderId)
      } else {
        // Rider not entered — find cheapest substitute in same slot type
        const needsWildcard = prev.isWildcard && wildcardCount < 2
        const substitute = entriesRes.rows.find((entry: { riderId: string; isWildcardEligible: boolean }) =>
          !usedRiderIds.has(entry.riderId) &&
          (needsWildcard ? entry.isWildcardEligible : true)
        )
        if (substitute) {
          if (needsWildcard) wildcardCount++
          finalPicks.push({
            riderId: substitute.riderId,
            isWildcard: needsWildcard,
            priceAtPick: substitute.marketPriceCents,
          })
          usedRiderIds.add(substitute.riderId)
        }
      }
    }

    if (finalPicks.length === 0) {
      console.log(`[mulligan.auto-pick] Could not build any picks for team ${teamId} — skipping`)
      return
    }

    // 7. Atomic transaction: lock mulligan balance, insert picks, consume mulligan
    await client.query('BEGIN')
    try {
      // Lock the mulligan balance row
      const lockedBalanceRes = await client.query(
        `SELECT "totalPurchased", "totalUsed"
         FROM mulligan_balances
         WHERE "userId" = $1
         FOR UPDATE`,
        [userId]
      )
      if (
        lockedBalanceRes.rows.length === 0 ||
        lockedBalanceRes.rows[0].totalPurchased - lockedBalanceRes.rows[0].totalUsed <= 0
      ) {
        await client.query('ROLLBACK')
        console.log(`[mulligan.auto-pick] Balance gone by transaction time for user ${userId}`)
        return
      }

      // Insert picks
      for (const pick of finalPicks) {
        await client.query(
          `INSERT INTO fantasy_picks (id, "teamId", "eventId", "riderId", "isWildcard", "priceAtPick", "lockedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
           ON CONFLICT ("teamId", "eventId", "riderId") DO NOTHING`,
          [teamId, eventId, pick.riderId, pick.isWildcard, pick.priceAtPick]
        )
      }

      // Consume mulligan
      await client.query(
        `UPDATE mulligan_balances SET "totalUsed" = "totalUsed" + 1 WHERE "userId" = $1`,
        [userId]
      )

      // Record mulligan use
      await client.query(
        `INSERT INTO mulligan_uses (id, "userId", "teamId", "eventId", "usedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())
         ON CONFLICT ("teamId", "eventId") DO NOTHING`,
        [userId, teamId, eventId]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }

    // 8. Enqueue price recalculation (outside transaction)
    const boss = await getBoss()
    await boss.send('fantasy.prices.recalculate', { eventId })

    console.log(
      `[mulligan.auto-pick] Auto-picked ${finalPicks.length} riders for team ${teamId}, event ${eventId}`
    )
  } finally {
    client.release()
  }
}
