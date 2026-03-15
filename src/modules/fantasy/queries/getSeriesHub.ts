import { db } from '@/lib/db/client'

export async function getSeriesHub(seriesSlug: string) {
  const [discipline, seasonStr] = seriesSlug.split('-')
  const season = parseInt(seasonStr)

  const series = await db.fantasySeries.findUnique({
    where: { discipline_season: { discipline: discipline as 'dh' | 'ews' | 'xc', season } },
    include: {
      events: {
        orderBy: { raceDate: 'asc' },
        include: { _count: { select: { picks: true } } },
      },
    },
  })
  return series
}
