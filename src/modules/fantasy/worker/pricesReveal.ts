// src/modules/fantasy/worker/pricesReveal.ts
import { pool } from '@/lib/db/client'
import { db } from '@/lib/db/client'

export async function handlePricesReveal(payload: { eventId: string }) {
  const { eventId } = payload
  const client = await pool.connect()
  try {
    // 1. Load event + series metadata (including forumThreadId)
    const eventRes = await client.query(
      `SELECT e.id, e."seriesId", e.name, e."forumThreadId", s.season
       FROM fantasy_events e
       JOIN fantasy_series s ON s.id = e."seriesId"
       WHERE e.id = $1`,
      [eventId]
    )
    if (eventRes.rows.length === 0) {
      console.error(`[fantasy.prices.reveal] Event ${eventId} not found`)
      return
    }
    const { seriesId, name: eventName, forumThreadId, season } = eventRes.rows[0]

    // 2. Count total teams
    const teamCountRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM fantasy_teams
       WHERE "seriesId" = $1 AND season = $2`,
      [seriesId, season]
    )
    const totalTeams: number = teamCountRes.rows[0].count

    // 3. Count picks per rider
    const picksRes = await client.query(
      `SELECT fp."riderId", COUNT(*)::int AS count, r.name AS "riderName"
       FROM fantasy_picks fp
       JOIN riders r ON r.id = fp."riderId"
       WHERE fp."eventId" = $1
       GROUP BY fp."riderId", r.name`,
      [eventId]
    )

    // 4. Update ownershipPct for each rider
    for (const row of picksRes.rows) {
      const ownershipPct = totalTeams > 0
        ? (row.count / totalTeams) * 100
        : 0
      await client.query(
        `UPDATE rider_event_entries
         SET "ownershipPct" = $1
         WHERE "eventId" = $2 AND "riderId" = $3`,
        [ownershipPct, eventId, row.riderId]
      )
    }

    // 5. Post forum ownership breakdown if configured
    const botUserId = process.env.FANTASY_BOT_USER_ID
    if (forumThreadId && botUserId) {
      const sorted = [...picksRes.rows].sort(
        (a: { count: number }, b: { count: number }) => b.count - a.count
      )

      const lines: string[] = [
        `**${eventName} — Roster Lock Ownership Breakdown**`,
        ``,
        `Total teams: **${totalTeams}**`,
        ``,
        `| Rider | Owned By | % |`,
        `|-------|----------|---|`,
      ]

      for (const row of sorted) {
        const pct = totalTeams > 0
          ? ((row.count / totalTeams) * 100).toFixed(1)
          : '0.0'
        lines.push(`| ${row.riderName} | ${row.count} teams | ${pct}% |`)
      }

      const content = lines.join('\n')

      try {
        await db.comment.create({
          data: {
            postId: forumThreadId,
            authorId: botUserId,
            body: content,
          },
        })
        console.log(
          `[fantasy.prices.reveal] Posted ownership breakdown to thread ${forumThreadId}`
        )
      } catch (err) {
        // Non-fatal — ownership data is in Postgres regardless
        console.error('[fantasy.prices.reveal] Failed to post forum reply:', err)
      }
    }

    console.log(
      `[fantasy.prices.reveal] Event ${eventId}: ownership finalized for ${picksRes.rows.length} riders`
    )
  } finally {
    client.release()
  }
}
