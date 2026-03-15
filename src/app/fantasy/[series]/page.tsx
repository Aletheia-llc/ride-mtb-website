import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function SeriesHubPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  return (
    <div className="py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] uppercase font-semibold">{seriesData.discipline.toUpperCase()}</p>
          <h1 className="text-2xl font-extrabold">{seriesData.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/fantasy/${series}/leaderboard`}
            className="border border-[var(--color-border)] rounded px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)]">
            Leaderboard
          </Link>
          <Link href={`/fantasy/${series}/riders`}
            className="border border-[var(--color-border)] rounded px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)]">
            Riders
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Events</h2>
        {seriesData.events.map(event => {
          const isOpen = event.status === 'roster_open'
          return (
            <div key={event.id} className="border border-[var(--color-border)] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {event.location} · {new Date(event.raceDate).toLocaleDateString()}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isOpen ? 'bg-green-100 text-green-700' :
                  event.status === 'scored' ? 'bg-gray-100 text-gray-600' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{event.status.replace('_', ' ')}</span>
              </div>
              {isOpen && (
                <Link href={`/fantasy/${series}/team`}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Build Team
                </Link>
              )}
              {event.status === 'scored' && (
                <Link href={`/fantasy/${series}/team/${event.id}`}
                  className="border border-[var(--color-border)] px-3 py-1.5 rounded text-sm">
                  View Results
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
