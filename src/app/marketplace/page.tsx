import { Suspense } from 'react'
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
  const params = await searchParams

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

  const { listings } = await browseListings(filters)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Browse Listings</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Find used mountain bikes and gear from riders in your community.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Suspense fallback={null}>
          <BrowseFilterSidebar />
        </Suspense>

        <div className="min-w-0 flex-1">
          <Suspense fallback={<BrowseGridFallback />}>
            <BrowseGrid listings={listings} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
