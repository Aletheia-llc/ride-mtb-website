'use server'

import { auth } from '@/lib/auth'
import { pool } from '@/lib/db/client'
import { getBoss } from '@/lib/pgboss'

export async function dropRider(input: {
  teamId: string
  eventId: string
  riderId: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Verify team belongs to user and pick is not locked
    const res = await client.query(
      `DELETE FROM fantasy_picks
       WHERE "teamId" = $1 AND "eventId" = $2 AND "riderId" = $3 AND "lockedAt" IS NULL
       RETURNING id`,
      [input.teamId, input.eventId, input.riderId]
    )

    if (res.rowCount === 0) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Pick not found or roster is locked' }
    }

    // Verify ownership
    const teamRes = await client.query(
      `SELECT "userId" FROM fantasy_teams WHERE id = $1`,
      [input.teamId]
    )
    if (teamRes.rows[0]?.userId !== session.user.id) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Not your team' }
    }

    await client.query('COMMIT')

    const boss = await getBoss()
    await boss.send('fantasy.prices.recalculate', { eventId: input.eventId }, { priority: 10 })

    return { success: true }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('dropRider error:', err)
    return { success: false, error: 'Failed to drop rider' }
  } finally {
    client.release()
  }
}
