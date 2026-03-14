import type { Metadata } from 'next'
import Link from 'next/link'
import { MapIcon } from 'lucide-react'
import { ShopList } from '@/modules/shops'
// eslint-disable-next-line no-restricted-imports
import { getShops } from '@/modules/shops/lib/queries'

export const metadata: Metadata = {
  title: 'Bike Shops | Ride MTB',
  description: 'Find mountain bike shops near you — service, parts, gear, and expert advice.',
}

interface ShopsPageProps {
  searchParams: Promise<{ state?: string; q?: string; page?: string }>
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

export default async function ShopsPage({ searchParams }: ShopsPageProps) {
  const params = await searchParams

  const state = US_STATES.includes(params.state?.toUpperCase() ?? '')
    ? params.state!.toUpperCase()
    : undefined
  const search = params.q || undefined
  const page = Math.max(1, Number(params.page) || 1)

  const { shops, totalCount } = await getShops(
    { state, search },
    page,
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Bike Shops</h1>
          <p className="text-[var(--color-text-muted)]">
            Find mountain bike shops for service, parts, and gear.
          </p>
        </div>
        <Link
          href="/shops/map"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          <MapIcon className="h-4 w-4" />
          Map View
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <form className="flex-1" method="GET" action="/shops">
          {state && <input type="hidden" name="state" value={state} />}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search shops..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </form>

        {/* State filter */}
        <div className="flex flex-wrap gap-1.5">
          <a
            href={`/shops${search ? `?q=${search}` : ''}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !state
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All
          </a>
          {US_STATES.map((s) => (
            <a
              key={s}
              href={`/shops?state=${s}${search ? `&q=${search}` : ''}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                state === s
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      {/* Active filters */}
      {(state || search) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {state && (
            <a
              href={`/shops${search ? `?q=${search}` : ''}`}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80"
            >
              {state} &times;
            </a>
          )}
          {search && (
            <a
              href={`/shops${state ? `?state=${state}` : ''}`}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80"
            >
              &ldquo;{search}&rdquo; &times;
            </a>
          )}
        </div>
      )}

      {/* Shop list */}
      <ShopList shops={shops} totalCount={totalCount} />
    </div>
  )
}
