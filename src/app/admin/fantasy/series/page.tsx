import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db/client'
import { Card } from '@/ui/components'

export const metadata: Metadata = {
  title: 'Fantasy Series | Admin | Ride MTB',
}

export default async function AdminFantasySeriesPage() {
  const series = await db.fantasySeries.findMany({
    orderBy: [{ season: 'desc' }, { discipline: 'asc' }],
    include: {
      _count: {
        select: { events: true, teams: true, leagues: true },
      },
    },
  })

  const statusColors = {
    upcoming: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Fantasy Series</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {series.length} {series.length === 1 ? 'series' : 'series'}
          </p>
        </div>
        <Link
          href="/admin/fantasy/series/new"
          className="inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          + New Series
        </Link>
      </div>

      {series.length === 0 ? (
        <Card className="p-8">
          <p className="text-center text-[var(--color-text-muted)]">
            No series created yet. <Link href="/admin/fantasy/series/new" className="text-[var(--color-primary)] hover:underline">Create one</Link>.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {series.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{s.name}</p>
                      <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                        {s.discipline.toUpperCase()} · Season {s.season} · {s._count.events} events · {s._count.teams} teams · {s._count.leagues} leagues
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusColors[s.status as keyof typeof statusColors]
                      }`}
                    >
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/admin/fantasy/series/${s.id}`}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-bg-hover)]"
                >
                  Edit
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
