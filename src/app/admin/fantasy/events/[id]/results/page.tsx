import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RiderResultRow } from './ResultsForm'
import { RunScoringButton } from './RunScoringButton'

export const metadata = { title: 'Race Results | Admin' }

export default async function AdminEventResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireAdmin()

  const event = await db.fantasyEvent.findUnique({
    where: { id },
    include: {
      series: { select: { name: true } },
      riderEntries: {
        include: { rider: { select: { id: true, name: true } } },
        orderBy: { basePriceCents: 'desc' },
      },
      results: true,
    },
  })

  if (!event) notFound()

  const resultsByRider = new Map(event.results.map((r) => [r.riderId, r]))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link
            href={`/admin/fantasy/events/${id}`}
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Back to Event
          </Link>
          <h1 className="text-2xl font-bold">Race Results — {event.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {event.series.name} · Status:{' '}
            <span className="font-mono font-semibold">{event.status}</span>
          </p>
        </div>
        <RunScoringButton eventId={id} />
      </div>

      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left">
              <th className="py-3 px-3 font-semibold w-44">Rider</th>
              <th className="py-3 pr-3 font-semibold w-24">Finish #</th>
              <th className="py-3 pr-3 font-semibold w-24">Qual #</th>
              <th className="py-3 pr-3 font-semibold w-20">DNS/DNF</th>
              <th className="py-3 pr-3 font-semibold w-20">Partial</th>
              <th className="py-3 pr-3 font-semibold w-24">Status</th>
              <th className="py-3 pr-3 font-semibold w-16"></th>
              <th className="py-3 pr-3 font-semibold w-16"></th>
            </tr>
          </thead>
          <tbody>
            {event.riderEntries.map((entry) => (
              <RiderResultRow
                key={entry.rider.id}
                eventId={id}
                rider={entry.rider}
                result={resultsByRider.get(entry.rider.id) ?? undefined}
              />
            ))}
          </tbody>
        </table>
        {event.riderEntries.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] p-4 text-center">
            No riders entered for this event.
          </p>
        )}
      </div>
    </div>
  )
}
