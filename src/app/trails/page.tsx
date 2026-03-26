import type { Metadata } from 'next'
import Link from 'next/link'
import { Map, Compass } from 'lucide-react'
import { SystemCard } from '@/modules/trails'
import { Button } from '@/ui/components'
// eslint-disable-next-line no-restricted-imports
import { getTrailSystems } from '@/modules/trails/lib/queries'

export const metadata: Metadata = {
  title: 'Trails | Ride MTB',
  description:
    'Explore mountain bike trail systems, view maps, and find your next ride.',
}

export default async function TrailsPage() {
  const systems = await getTrailSystems()

  // Group by state, sort groups by count descending, null state → "Other" at end
  const grouped = systems.reduce(
    (acc, s) => {
      const key = s.state ?? '__other__'
      if (!acc[key]) acc[key] = []
      acc[key].push(s)
      return acc
    },
    {} as Record<string, (typeof systems)[number][]>
  )

  const sortedGroups = Object.entries(grouped).sort(([aKey, aList], [bKey, bList]) => {
    if (aKey === '__other__') return 1
    if (bKey === '__other__') return -1
    return bList.length - aList.length
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Compact hero */}
      <section className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          Trail Systems
        </h1>
        <p className="mb-5 text-[var(--color-text-muted)]">
          Mountain bike trail systems across the US — browse by state or explore the map.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/trails/map">
            <Button size="sm">
              <Map className="h-4 w-4" />
              Trail Map
            </Button>
          </Link>
          <Link href="/trails/explore">
            <Button variant="secondary" size="sm">
              <Compass className="h-4 w-4" />
              Browse All
            </Button>
          </Link>
        </div>
      </section>

      {/* State-grouped sections */}
      {sortedGroups.length > 0 ? (
        <div className="space-y-10">
          {sortedGroups.map(([stateKey, stateSystems]) => {
            const label = stateKey === '__other__' ? 'Other' : stateKey
            return (
              <section key={stateKey}>
                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
                  {label}
                  <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                    · {stateSystems.length} {stateSystems.length === 1 ? 'system' : 'systems'}
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stateSystems.map((system: (typeof systems)[number]) => (
                    <SystemCard key={system.id} system={system} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          No trail systems available yet.
        </p>
      )}
    </div>
  )
}
