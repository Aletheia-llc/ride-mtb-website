import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pool } = await import('@/lib/db/client')
  const { getBoss } = await import('@/lib/pgboss')

  const now = new Date()

  const eventsToLock = await pool.query(
    `SELECT id, "seriesId", (
       SELECT season FROM fantasy_series WHERE id = fe."seriesId"
     ) AS season
     FROM fantasy_events fe
     WHERE status = 'roster_open' AND "rosterDeadline" <= $1`,
    [now]
  )

  let locked = 0
  let mulliganJobsEnqueued = 0

  for (const event of eventsToLock.rows) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `UPDATE fantasy_picks SET "lockedAt" = $1
         WHERE "eventId" = $2 AND "lockedAt" IS NULL`,
        [now, event.id]
      )

      await client.query(
        `UPDATE fantasy_events SET status = 'locked' WHERE id = $1`,
        [event.id]
      )

      await client.query('COMMIT')

      const boss = await getBoss()

      // Send prices reveal job (Phase 3 — existing)
      await boss.send('fantasy.prices.reveal', { eventId: event.id })

      // Find teams with zero picks for this event whose user has a positive mulligan balance
      // A "zero picks" team may have been registered for the series but never built a team for this event.
      const mulliganTeamsRes = await client.query(
        `SELECT ft.id AS "teamId", ft."userId"
         FROM fantasy_teams ft
         JOIN mulligan_balances mb ON mb."userId" = ft."userId"
         WHERE ft."seriesId" = $1
           AND ft.season = $2
           AND (mb."totalPurchased" - mb."totalUsed") > 0
           AND NOT EXISTS (
             SELECT 1 FROM fantasy_picks fp
             WHERE fp."teamId" = ft.id AND fp."eventId" = $3
           )
           AND NOT EXISTS (
             SELECT 1 FROM mulligan_uses mu
             WHERE mu."teamId" = ft.id AND mu."eventId" = $3
           )`,
        [event.seriesId, event.season, event.id]
      )

      for (const team of mulliganTeamsRes.rows) {
        await boss.send(
          'fantasy.mulligan.auto-pick',
          { teamId: team.teamId, eventId: event.id, userId: team.userId },
          {
            // Delay 10 seconds to allow the prices reveal worker to finish first
            startAfter: new Date(Date.now() + 10_000),
          }
        )
        mulliganJobsEnqueued++
      }

      locked++
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`Failed to lock event ${event.id}:`, err)
    } finally {
      client.release()
    }
  }

  return NextResponse.json({
    locked,
    mulliganJobsEnqueued,
    timestamp: new Date().toISOString(),
  })
}
