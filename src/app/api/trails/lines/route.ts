import { NextResponse } from 'next/server'
import { pool } from '@/lib/db/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const systemIds = searchParams.get('systemIds')?.split(',').filter(Boolean) ?? []

  if (systemIds.length === 0) return NextResponse.json([])
  if (systemIds.length > 10) return NextResponse.json({ error: 'Too many systems' }, { status: 400 })

  try {
    const result = await pool.query(`
      SELECT t.id, t.slug, t.name,
             t."physicalDifficulty", t."technicalDifficulty",
             t.distance,
             g."trackData",
             ts.slug AS "systemSlug"
      FROM trails t
      JOIN trail_gps_tracks g ON g."trailId" = t.id
      JOIN trail_systems ts ON ts.id = t."trailSystemId"
      WHERE t."trailSystemId" = ANY($1)
        AND g."trackData" IS NOT NULL
      ORDER BY t.name
    `, [systemIds])
    const rows = result.rows.map(row => ({
      ...row,
      trackData: typeof row.trackData === 'string' ? JSON.parse(row.trackData) : row.trackData,
    }))
    return NextResponse.json(rows)
  } catch (error) {
    console.error('GET /api/trails/lines error:', error)
    return NextResponse.json({ error: 'Failed to fetch trail lines' }, { status: 500 })
  }
}
