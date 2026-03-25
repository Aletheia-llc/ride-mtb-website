import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { browseListings } from '@/modules/marketplace/actions/listings'
import { BrowseGrid } from '@/modules/marketplace/components/browse/BrowseGrid'
import { BrowseFilterSidebar } from '@/modules/marketplace/components/browse/BrowseFilterSidebar'
import { ListingCardSkeleton } from '@/modules/marketplace/components/ui/ListingCardSkeleton'
import type { BrowseOptions, ListingCategory, ItemCondition, FulfillmentType } from '@/modules/marketplace/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy & Sell MTB Gear | Ride MTB Marketplace',
  description:
    'Browse used mountain bikes, frames, components, and gear from riders in your community.',
}

interface MarketplacePageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

function BrowseGridFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const [params, session] = await Promise.all([searchParams, auth()])

  const getString = (key: string): string | undefined => {
    const val = params[key]
    return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined
  }

  const filters: BrowseOptions = {}

  const category = getString('category')
  if (category) filters.category = category as ListingCategory

  const condition = params['condition']
  if (condition) {
    const raw = Array.isArray(condition) ? condition : [condition]
    filters.condition = raw as ItemCondition[]
  }

  const fulfillment = getString('fulfillment')
  if (fulfillment) filters.fulfillment = fulfillment as FulfillmentType

  const minPrice = getString('minPrice')
  if (minPrice) filters.minPrice = Number(minPrice)

  const maxPrice = getString('maxPrice')
  if (maxPrice) filters.maxPrice = Number(maxPrice)

  const brand = getString('brand')
  if (brand) filters.brand = brand

  const city = getString('city')
  if (city) filters.city = city

  const state = getString('state')
  if (state) filters.state = state

  const sort = getString('sort')
  if (sort) filters.sort = sort as BrowseOptions['sort']

  const cursor = getString('cursor')
  if (cursor) filters.cursor = cursor

  const { listings, total } = await browseListings(filters)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header row */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Browse Listings</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {total > 0
              ? `${total.toLocaleString()} listing${total === 1 ? '' : 's'} — find used mountain bikes and gear.`
              : 'Find used mountain bikes and gear from riders in your community.'}
          </p>
        </div>

        {/* New Listing button — only for signed-in users */}
        {session?.user ? (
          <Link
            href="/buy-sell/sell"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            New Listing
          </Link>
        ) : (
          <Link
            href="/api/auth/signin"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
          >
            <Plus className="h-4 w-4" />
            Sell Something
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Suspense fallback={null}>
          <BrowseFilterSidebar />
        </Suspense>

        <div className="min-w-0 flex-1">
          <Suspense fallback={<BrowseGridFallback />}>
            <BrowseGrid listings={listings} />
          </Suspense>

          {/* Load More / pagination hint */}
          {listings.length > 0 && total > listings.length && (
            <div className="mt-8 flex justify-center">
              <Link
                href={`/buy-sell?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])), cursor: listings[listings.length - 1].id }).toString()}`}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
              >
                Load more ({total - listings.length} remaining)
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
