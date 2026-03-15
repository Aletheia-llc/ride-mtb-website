import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { SeriesForm } from '../SeriesForm'
import { ChampionshipLeagueForm } from '../ChampionshipLeagueForm'

export const metadata: Metadata = {
  title: 'Edit Fantasy Series | Admin | Ride MTB',
}

interface EditSeriesPageProps {
  params: Promise<{ id: string }>
}

export default async function EditSeriesPage({ params }: EditSeriesPageProps) {
  const { id } = await params

  const series = await db.fantasySeries.findUnique({
    where: { id },
  })

  if (!series) {
    notFound()
  }

  const championshipLeague = await db.fantasyLeague.findFirst({
    where: { seriesId: id, season: series.season, isChampionship: true },
    select: { id: true },
  })

  return (
    <div className="space-y-6">
      <SeriesForm series={series} />
      <ChampionshipLeagueForm
        seriesId={series.id}
        season={series.season}
        exists={!!championshipLeague}
      />
    </div>
  )
}
