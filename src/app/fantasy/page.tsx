import { auth } from '@/lib/auth'
import { getFantasyLanding } from '@/modules/fantasy/queries/getFantasyLanding'
import Link from 'next/link'

export default async function FantasyPage() {
  const session = await auth()
  const { activeSeries, userTeams } = await getFantasyLanding(session?.user?.id)

  return (
    <div className="py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold mb-2">Fantasy MTB</h1>
        <p className="text-[var(--color-text-muted)]">
          Build your roster. Beat the field. Prove you know who&apos;s fast.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeSeries.map(s => {
          const slug = `${s.discipline}-${s.season}`
          const hasTeam = userTeams.some(t => t.seriesId === s.id)
          const nextEvent = s.events[0]

          return (
            <Link key={s.id} href={`/fantasy/${slug}`}
              className="border border-[var(--color-border)] rounded-xl p-5 hover:bg-[var(--color-bg-secondary)] transition-colors block">
              <p className="text-xs text-[var(--color-text-muted)] uppercase font-semibold mb-1">
                {s.discipline.toUpperCase()} · {s.season}
              </p>
              <h2 className="text-lg font-bold mb-2">{s.name}</h2>
              {nextEvent && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Next: {nextEvent.name} · {new Date(nextEvent.raceDate).toLocaleDateString()}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">{s._count.teams} teams</span>
                {hasTeam
                  ? <span className="text-xs text-green-600 font-medium">✓ Entered</span>
                  : <span className="text-xs text-blue-600 font-medium">Join →</span>
                }
              </div>
            </Link>
          )
        })}
        {activeSeries.length === 0 && (
          <p className="text-[var(--color-text-muted)] text-sm col-span-3">
            No active series yet. Check back soon.
          </p>
        )}
      </div>
    </div>
  )
}
