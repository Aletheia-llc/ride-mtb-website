import Link from 'next/link'
import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata = {
  title: 'Fantasy Admin Hub',
}

export default async function AdminFantasyHub() {
  await requireAdmin()

  const [seriesCount, riderCount, activeEventCount, openEvents] = await Promise.all([
    db.fantasySeries.count(),
    db.rider.count(),
    db.fantasyEvent.count({ where: { status: { in: ['roster_open', 'results_pending'] } } }),
    db.fantasyEvent.findMany({
      where: { status: { in: ['roster_open', 'results_pending'] } },
      include: { series: { select: { name: true } } },
      take: 5,
    }),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fantasy MTB Admin</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link href="/admin/fantasy/series"
          className="border border-[var(--color-border)] rounded-lg p-4 text-center hover:bg-[var(--color-bg-secondary)] transition">
          <p className="text-3xl font-bold">{seriesCount}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Series</p>
        </Link>

        <Link href="/admin/fantasy/riders"
          className="border border-[var(--color-border)] rounded-lg p-4 text-center hover:bg-[var(--color-bg-secondary)] transition">
          <p className="text-3xl font-bold">{riderCount}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Riders</p>
        </Link>

        <Link href="/admin/fantasy/events"
          className="border border-[var(--color-border)] rounded-lg p-4 text-center hover:bg-[var(--color-bg-secondary)] transition">
          <p className="text-3xl font-bold">{activeEventCount}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Active Events</p>
        </Link>
      </div>

      {openEvents.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Events Needing Attention</h2>
          <div className="space-y-2">
            {openEvents.map(e => (
              <div key={e.id} className="flex justify-between items-center border border-[var(--color-border)] rounded p-3 text-sm hover:bg-[var(--color-bg-hover)] transition">
                <div>
                  <span className="font-medium">{e.name}</span>
                  <span className="text-[var(--color-text-muted)] ml-2">({e.series.name})</span>
                </div>
                <span className="text-orange-600 font-medium">{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
