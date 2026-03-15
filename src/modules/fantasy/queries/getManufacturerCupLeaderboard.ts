import { pool } from '@/lib/db/client'

export type ManufacturerCupEntry = {
  rank: number
  userId: string
  username: string | null
  avatarUrl: string | null
  manufacturerName: string
  manufacturerSlug: string
  manufacturerLogoUrl: string | null
  seasonTotal: number
  eventsScored: number
}

export async function getManufacturerCupLeaderboard(
  seriesId: string,
  season: number
): Promise<ManufacturerCupEntry[]> {
  const res = await pool.query(
    `SELECT
       u.id AS "userId",
       u.username,
       u."avatarUrl",
       bm.name AS "manufacturerName",
       bm.slug AS "manufacturerSlug",
       bm."logoUrl" AS "manufacturerLogoUrl",
       COALESCE(SUM(mes.points), 0) AS "seasonTotal",
       COUNT(mes.id) FILTER (WHERE mes.points > 0) AS "eventsScored"
     FROM manufacturer_picks mp
     JOIN users u ON u.id = mp."userId"
     JOIN bike_manufacturers bm ON bm.id = mp."manufacturerId"
     LEFT JOIN manufacturer_event_scores mes
       ON mes."manufacturerPickId" = mp.id
     WHERE mp."seriesId" = $1
       AND mp.season = $2
       AND mp."lockedAt" IS NOT NULL
     GROUP BY u.id, u.username, u."avatarUrl", bm.name, bm.slug, bm."logoUrl"
     ORDER BY "seasonTotal" DESC, "eventsScored" DESC, u.id ASC`,
    [seriesId, season]
  )

  return res.rows.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    username: row.username,
    avatarUrl: row.avatarUrl,
    manufacturerName: row.manufacturerName,
    manufacturerSlug: row.manufacturerSlug,
    manufacturerLogoUrl: row.manufacturerLogoUrl,
    seasonTotal: Number(row.seasonTotal),
    eventsScored: Number(row.eventsScored),
  }))
}
