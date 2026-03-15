// src/modules/fantasy/queries/getChampionshipLeaderboard.ts
import { pool } from '@/lib/db/client'

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string | null
  username: string | null
  avatarUrl: string | null
  totalPoints: number
  eventsPlayed: number
  bestEventScore: number | null
  worstEventScore: number | null
}

export async function getChampionshipLeaderboard(
  seriesId: string,
  season: number
): Promise<LeaderboardEntry[]> {
  const result = await pool.query(
    `SELECT
       fss.rank,
       u.id AS "userId",
       u.name,
       u.username,
       u."avatarUrl",
       fss."totalPoints",
       fss."eventsPlayed",
       fss."bestEventScore",
       fss."worstEventScore"
     FROM fantasy_season_scores fss
     JOIN fantasy_teams ft ON ft.id = fss."teamId"
     JOIN users u ON u.id = ft."userId"
     -- Only include users who are members of the championship league for this series+season
     WHERE EXISTS (
       SELECT 1
       FROM fantasy_league_members flm
       JOIN fantasy_leagues fl ON fl.id = flm."leagueId"
       WHERE fl."seriesId" = $1
         AND fl.season = $2
         AND fl."isChampionship" = TRUE
         AND flm."userId" = ft."userId"
     )
     AND fss."seriesId" = $1
     AND fss.season = $2
     ORDER BY fss."totalPoints" DESC, fss.rank ASC NULLS LAST`,
    [seriesId, season]
  )

  return result.rows.map(
    (
      row: {
        rank: number | null
        userId: string
        name: string | null
        username: string | null
        avatarUrl: string | null
        totalPoints: number
        eventsPlayed: number
        bestEventScore: number | null
        worstEventScore: number | null
      },
      i: number
    ) => ({
      rank: row.rank ?? i + 1,
      userId: row.userId,
      name: row.name,
      username: row.username,
      avatarUrl: row.avatarUrl,
      totalPoints: row.totalPoints,
      eventsPlayed: row.eventsPlayed,
      bestEventScore: row.bestEventScore,
      worstEventScore: row.worstEventScore,
    })
  )
}
