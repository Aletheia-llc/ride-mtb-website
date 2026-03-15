import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { db } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/modules/fantasy/lib/pricing'

export default async function RidersPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  const openEvent = seriesData.events.find(e => e.status === 'roster_open')

  const riders = openEvent
    ? await db.riderEventEntry.findMany({
        where: { eventId: openEvent.id },
        include: { rider: true },
        orderBy: { marketPriceCents: 'desc' },
      })
    : []

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{seriesData.name} — Rider Research</h1>
      {!openEvent && (
        <p className="text-sm text-[var(--color-text-muted)]">No event currently open for roster selection.</p>
      )}
      {riders.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="pb-2">Rider</th>
              <th className="pb-2 text-right">Base</th>
              <th className="pb-2 text-right">Market</th>
              <th className="pb-2 text-right hidden md:table-cell">Ownership</th>
              <th className="pb-2 text-right hidden md:table-cell">Last Pts</th>
            </tr>
          </thead>
          <tbody>
            {riders.map(e => (
              <tr key={e.riderId} className="border-b border-[var(--color-border)]">
                <td className="py-2 pr-4">
                  <p className="font-medium">{e.rider.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{e.rider.nationality}</p>
                </td>
                <td className="py-2 text-right font-mono text-xs">{formatPrice(e.basePriceCents)}</td>
                <td className="py-2 text-right font-mono text-xs font-semibold">{formatPrice(e.marketPriceCents)}</td>
                <td className="py-2 text-right text-[var(--color-text-muted)] hidden md:table-cell">
                  {e.ownershipPct !== null ? `${e.ownershipPct.toFixed(1)}%` : '🔒'}
                </td>
                <td className="py-2 text-right hidden md:table-cell">{e.fantasyPoints ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
