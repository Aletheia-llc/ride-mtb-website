import { NextResponse } from 'next/server'
import { pool } from '@/lib/db/client'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, slug, name, city, state, latitude, longitude,
             "averageRating",
             (SELECT COUNT(*) FROM trails WHERE "trailSystemId" = trail_systems.id) AS "trailCount"
      FROM trail_systems
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY name
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/trails/map error:', error)
    return NextResponse.json({ error: 'Failed to fetch trail systems' }, { status: 500 })
  }
}
