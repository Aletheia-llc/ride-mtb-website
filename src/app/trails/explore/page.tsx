import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { SystemCard } from '@/modules/trails'
import { EmptyState } from '@/ui/components'
// eslint-disable-next-line no-restricted-imports
import { getTrailSystems, type TrailSystemFilters } from '@/modules/trails/lib/queries'

export const metadata: Metadata = {
  title: 'Explore Trails | Ride MTB',
  description:
    'Browse and filter mountain bike trail systems by type, state, and more.',
}

export default async function ExploreTrailsPage({
  searchParams,
}: {
  searchParams: Promise<{
    systemType?: string
    state?: string
    search?: string
  }>
}) {
  const params = await searchParams

  const systems = await getTrailSystems({
    systemType: params.systemType as TrailSystemFilters['systemType'],
    state: params.state,
    search: params.search,
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Explore Trails
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Find trail systems by name, location, or type.
      </p>

      {/* Filter controls */}
      <form className="mb-8 flex flex-wrap items-end gap-4">
        {/* Search */}
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label
            htmlFor="search"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              id="search"
              name="search"
              type="text"
              defaultValue={params.search ?? ''}
              placeholder="Search by name or city..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        {/* System type */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="systemType"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Type
          </label>
          <select
            id="systemType"
            name="systemType"
            defaultValue={params.systemType ?? ''}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="">All Types</option>
            <option value="trail_network">Trail Network</option>
            <option value="bike_park">Bike Park</option>
            <option value="ski_resort">Ski Resort</option>
          </select>
        </div>

        {/* State */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="state"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            State
          </label>
          <input
            id="state"
            name="state"
            type="text"
            defaultValue={params.state ?? ''}
            placeholder="e.g. Utah"
            className="w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          Filter
        </button>

        {/* Clear filters */}
        {(params.search || params.systemType || params.state) && (
          <Link
            href="/trails/explore"
            className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Results */}
      {systems.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map((system) => (
            <SystemCard key={system.id} system={system} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="No trail systems found"
          description="Try adjusting your filters or search terms."
        />
      )}
    </div>
  )
}
