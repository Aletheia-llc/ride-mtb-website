import { db, pool } from '@/lib/db/client'

export async function getManufacturerPick(userId: string, seriesId: string, season: number) {
  const pick = await db.manufacturerPick.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    include: { manufacturer: { select: { id: true, name: true, slug: true, logoUrl: true } } },
  })
  if (!pick) return null

  // Get season total manufacturer points for this user
  const totalsRes = await pool.query(
    `SELECT COALESCE(SUM(points), 0) AS total
     FROM manufacturer_event_scores
     WHERE "userId" = $1 AND "seriesId" = $2 AND season = $3`,
    [userId, seriesId, season]
  )
  const seasonTotal = Number(totalsRes.rows[0]?.total ?? 0)

  return { ...pick, seasonTotal }
}

export type ManufacturerPickWithTotal = NonNullable<Awaited<ReturnType<typeof getManufacturerPick>>>
