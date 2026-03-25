import type { Metadata } from 'next'
import Link from 'next/link'
import { Mountain, Map, Compass } from 'lucide-react'
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <Mountain className="h-12 w-12 text-[var(--color-primary)]" />
        </div>
        <h1 className="mb-3 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          Explore Trails
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--color-text-muted)]">
          Discover trail systems, check conditions, and plan your next mountain
          bike adventure.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link href="/trails/explore">
            <Button size="lg">
              <Compass className="h-5 w-5" />
              Browse All Trails
            </Button>
          </Link>
          <Link href="/trails/map">
            <Button variant="secondary" size="lg">
              <Map className="h-5 w-5" />
              Trail Map
            </Button>
          </Link>
        </div>
      </section>

      {/* Trail Systems Grid */}
      <section>
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
          Trail Systems
        </h2>
        {systems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((system) => (
              <SystemCard key={system.id} system={system} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            No trail systems available yet.
          </p>
        )}
      </section>
    </div>
  )
}
