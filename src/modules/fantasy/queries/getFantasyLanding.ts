import { db } from '@/lib/db/client'

export async function getFantasyLanding(userId?: string) {
  const activeSeries = await db.fantasySeries.findMany({
    where: { status: { in: ['upcoming', 'active'] } },
    include: {
      events: {
        where: { status: { in: ['roster_open', 'upcoming'] } },
        orderBy: { raceDate: 'asc' },
        take: 1,
      },
      _count: { select: { teams: true } },
    },
    orderBy: { season: 'desc' },
  })

  const userTeams = userId
    ? await db.fantasyTeam.findMany({
        where: { userId },
        select: { seriesId: true, season: true },
      })
    : []

  return { activeSeries, userTeams }
}
