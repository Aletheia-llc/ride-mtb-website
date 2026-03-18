import { NextResponse } from 'next/server'
import { pool } from '@/lib/db/client'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, slug, title, "startDate", "eventType", latitude, longitude, "rsvpCount"
      FROM events
      WHERE status = 'published'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND "startDate" >= NOW()
      ORDER BY "startDate"
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/events/map error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
