import { db } from '@/lib/db/client'

export async function getGlobalLeaderboard(seriesId: string, season: number, page = 0, pageSize = 50) {
  const scores = await db.fantasySeasonScore.findMany({
    where: { seriesId, season },
    orderBy: [{ totalPoints: 'desc' }, { rank: 'asc' }],
    skip: page * pageSize,
    take: pageSize,
    include: {
      team: {
        include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      },
    },
  })

  return scores.map((s: {
    rank: number | null
    totalPoints: number
    eventsPlayed: number
    bestEventScore: number | null
    worstEventScore: number | null
    team: { user: { id: string; name: string | null; username: string | null; avatarUrl: string | null } }
  }, i: number) => ({
    rank: s.rank ?? page * pageSize + i + 1,
    userId: s.team.user.id,
    name: s.team.user.name,
    username: s.team.user.username,
    avatarUrl: s.team.user.avatarUrl,
    totalPoints: s.totalPoints,
    eventsPlayed: s.eventsPlayed,
    bestEventScore: s.bestEventScore,
    worstEventScore: s.worstEventScore,
  }))
}
