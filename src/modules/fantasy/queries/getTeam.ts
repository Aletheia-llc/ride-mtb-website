import { db } from '@/lib/db/client'

export async function getTeamForEvent(userId: string, seriesId: string, season: number, eventId: string) {
  const team = await db.fantasyTeam.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    include: {
      picks: {
        where: { eventId },
        include: { rider: true },
      },
    },
  })

  const series = await db.fantasySeries.findUnique({ where: { id: seriesId }, select: { salaryCap: true } })

  const picks = team?.picks ?? []
  const totalCost = picks.reduce((s: number, p: { priceAtPick: number }) => s + p.priceAtPick, 0)
  const remaining = (series?.salaryCap ?? 150_000_000) - totalCost

  return {
    teamId: team?.id ?? null,
    picks,
    totalCost,
    remaining,
    salaryCap: series?.salaryCap ?? 150_000_000,
    isFull: picks.length >= 6,
  }
}
