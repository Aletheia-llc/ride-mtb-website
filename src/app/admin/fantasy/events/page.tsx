import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'
import Link from 'next/link'

export const metadata = {
  title: 'Fantasy Events | Admin',
}

export default async function AdminFantasyEventsPage() {
  await requireAdmin()

  const events = await db.fantasyEvent.findMany({
    orderBy: { raceDate: 'desc' },
    include: {
      series: { select: { name: true, discipline: true } },
      _count: { select: { riderEntries: true, picks: true } },
    },
    take: 50,
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fantasy Events</h1>
        <Link
          href="/admin/fantasy/events/new"
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition"
        >
          + New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">No events yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(e => (
            <div
              key={e.id}
              className="border border-[var(--color-border)] rounded-lg p-4 flex justify-between items-center hover:bg-[var(--color-bg-hover)] transition"
            >
              <div>
                <p className="font-semibold">{e.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {e.series.name} · {e.location}, {e.country} · Race: {new Date(e.raceDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {e._count.riderEntries} riders · {e._count.picks} picks · status: <span className="font-mono">{e.status}</span>
                </p>
              </div>
              <Link
                href={`/admin/fantasy/events/${e.id}`}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Manage
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
