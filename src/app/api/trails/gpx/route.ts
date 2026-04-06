import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { pool } from '@/lib/db/client'
import {
  parseGpxToPoints,
  simplifyTrack,
  calculateTrailStats,
} from '@/modules/trails/lib/gpx-processor'
import { grantXP } from '@/modules/xp/lib/engine'

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const trailId = formData.get('trailId')
  if (!trailId || typeof trailId !== 'string') {
    return NextResponse.json({ error: 'Missing trailId' }, { status: 400 })
  }

  // Validate trail exists
  const trailCheck = await pool.query(
    'SELECT id, "hasGpsTrack" FROM trails WHERE id = $1',
    [trailId],
  )
  if (trailCheck.rowCount === 0) {
    return NextResponse.json({ error: 'Trail not found' }, { status: 404 })
  }

  // 3. Read GPX file as text
  const file = formData.get('file')
  if (!file) {
    return NextResponse.json({ error: 'Missing GPX file' }, { status: 400 })
  }

  let gpxText: string
  if (file instanceof File) {
    gpxText = await file.text()
  } else if (typeof file === 'string') {
    gpxText = file
  } else {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  // 4. Parse GPX to points
  const points = parseGpxToPoints(gpxText)
  if (points.length === 0) {
    return NextResponse.json(
      { error: 'No GPS points found in GPX file' },
      { status: 400 },
    )
  }

  // 5. Simplify track
  const simplified = simplifyTrack(points)

  // 6. Calculate trail stats
  const stats = calculateTrailStats(simplified)

  const trackDataJson = JSON.stringify(simplified)
  const { bounds } = stats

  // 7. Upsert trail_gps_tracks
  await pool.query(
    `INSERT INTO trail_gps_tracks (id, "trailId", "trackData", "pointCount", "boundsNeLat", "boundsNeLng", "boundsSwLat", "boundsSwLng", "contributorCount", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW())
     ON CONFLICT ("trailId") DO UPDATE SET
       "trackData" = EXCLUDED."trackData",
       "pointCount" = EXCLUDED."pointCount",
       "boundsNeLat" = EXCLUDED."boundsNeLat",
       "boundsNeLng" = EXCLUDED."boundsNeLng",
       "boundsSwLat" = EXCLUDED."boundsSwLat",
       "boundsSwLng" = EXCLUDED."boundsSwLng",
       "contributorCount" = trail_gps_tracks."contributorCount" + 1,
       "updatedAt" = NOW()`,
    [
      trailId,
      trackDataJson,
      simplified.length,
      bounds.neLat,
      bounds.neLng,
      bounds.swLat,
      bounds.swLng,
    ],
  )

  // 8. Update the trail record
  await pool.query(
    `UPDATE trails SET
       "hasGpsTrack" = true,
       distance = $1,
       "elevationGain" = $2,
       "elevationLoss" = $3,
       "highPoint" = $4,
       "lowPoint" = $5,
       "updatedAt" = NOW()
     WHERE id = $6`,
    [
      stats.distance,
      stats.elevationGain,
      stats.elevationLoss,
      stats.highPoint,
      stats.lowPoint,
      trailId,
    ],
  )

  // 9. Grant XP for GPS contribution
  void grantXP({ userId: session.user.id, event: 'trail_gpx_contributed', module: 'trails', refId: trailId })

  // 10. Return success
  return NextResponse.json({
    success: true,
    pointCount: simplified.length,
    distance: stats.distance,
    elevationGain: stats.elevationGain,
  })
}
