import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pool } = await import('@/lib/db/client')
  const { getBoss } = await import('@/lib/pgboss')

  const now = new Date()

  const eventsToLock = await pool.query(
    `SELECT id FROM fantasy_events
     WHERE status = 'roster_open' AND "rosterDeadline" <= $1`,
    [now]
  )

  let locked = 0
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
        `UPDATE fantasy_events SET status = 'results_pending' WHERE id = $1`,
        [event.id]
      )

      await client.query('COMMIT')

      const boss = await getBoss()
      await boss.send('fantasy.prices.reveal', { eventId: event.id })

      locked++
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`Failed to lock event ${event.id}:`, err)
    } finally {
      client.release()
    }
  }

  return NextResponse.json({ locked, timestamp: new Date().toISOString() })
}
