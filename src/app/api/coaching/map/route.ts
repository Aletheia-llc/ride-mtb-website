import { NextResponse } from 'next/server'
import { pool } from '@/lib/db/client'

export async function GET() {
  try {
    const [coachesResult, clinicsResult] = await Promise.all([
      pool.query(`
        SELECT cp.id, u.name, cp.latitude, cp.longitude,
               cp.specialties, cp."hourlyRate", cp."calcomLink"
        FROM coach_profiles cp
        JOIN users u ON u.id = cp."userId"
        WHERE cp.latitude IS NOT NULL AND cp.longitude IS NOT NULL
          AND cp."isActive" = true
      `),
      pool.query(`
        SELECT cc.id, cc.slug, cc.title, cc."startDate",
               cc.latitude, cc.longitude, cc."costCents", cc."isFree", cc."calcomLink",
               u.name AS "coachName"
        FROM coaching_clinics cc
        JOIN coach_profiles cp ON cp.id = cc."coachId"
        JOIN users u ON u.id = cp."userId"
        WHERE cc.status = 'published'
          AND cc."startDate" >= NOW()
          AND cc.latitude IS NOT NULL
          AND cc.longitude IS NOT NULL
        ORDER BY cc."startDate"
      `),
    ])
    return NextResponse.json({
      coaches: coachesResult.rows,
      clinics: clinicsResult.rows,
    })
  } catch (error) {
    console.error('GET /api/coaching/map error:', error)
    return NextResponse.json({ error: 'Failed to fetch coaching data' }, { status: 500 })
  }
}
