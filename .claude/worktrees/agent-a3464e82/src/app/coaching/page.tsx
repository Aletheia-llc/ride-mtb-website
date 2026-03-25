import type { Metadata } from 'next'
import Link from 'next/link'
import { CoachList } from '@/modules/coaching'
// eslint-disable-next-line no-restricted-imports
import { getCoaches, type CoachFilters } from '@/modules/coaching/lib/queries'

export const metadata: Metadata = {
  title: 'Find a Coach | Ride MTB',
  description:
    'Browse certified mountain bike coaches. Filter by specialty and location to find the right coach for you.',
}

export default async function CoachingPage({
  searchParams,
}: {
  searchParams: Promise<{
    specialty?: string
    location?: string
  }>
}) {
  const params = await searchParams

  const filters: CoachFilters = {
    specialty: params.specialty,
    location: params.location,
  }

  const coaches = await getCoaches(filters)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Find a Coach
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Work with a certified mountain bike coach to level up your riding.
      </p>

      {/* Filter controls */}
      <form className="mb-8 flex flex-wrap items-end gap-4">
        {/* Specialty */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="specialty"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Specialty
          </label>
          <input
            id="specialty"
            name="specialty"
            type="text"
            defaultValue={params.specialty ?? ''}
            placeholder="e.g. Downhill"
            className="w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="location"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={params.location ?? ''}
            placeholder="e.g. Utah"
            className="w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          Filter
        </button>

        {/* Clear filters */}
        {(params.specialty || params.location) && (
          <Link
            href="/coaching"
            className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Results */}
      <CoachList coaches={coaches} />
    </div>
  )
}
