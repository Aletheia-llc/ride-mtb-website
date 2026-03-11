import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { ShoppingBag, Plus } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { ListingGrid, ListingFilters } from '@/modules/marketplace'
import type { ListingCategory, ItemCondition } from '@/modules/marketplace'
// eslint-disable-next-line no-restricted-imports
import { getListings } from '@/modules/marketplace/lib/queries'

export const metadata: Metadata = {
  title: 'Marketplace | Ride MTB',
  description:
    'Buy and sell mountain bike gear. Browse bikes, parts, and accessories from the Ride MTB community.',
}

interface MarketplacePageProps {
  searchParams: Promise<{
    category?: string
    condition?: string
    minPrice?: string
    maxPrice?: string
    search?: string
    page?: string
  }>
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams
  const session = await auth()

  const filters = {
    category: params.category as ListingCategory | undefined,
    condition: params.condition as ItemCondition | undefined,
    search: params.search || undefined,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
  }

  const page = params.page ? parseInt(params.page, 10) : 1
  const { listings, totalCount } = await getListings(filters, page)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <ShoppingBag className="h-12 w-12 text-[var(--color-primary)]" />
        </div>
        <h1 className="mb-3 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          Marketplace
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--color-text-muted)]">
          Buy and sell mountain bike gear with the Ride MTB community.
        </p>
        {session?.user && (
          <div className="mt-6">
            <Link
              href="/marketplace/create"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              <Plus className="h-5 w-5" />
              Create Listing
            </Link>
          </div>
        )}
      </section>

      {/* Filters */}
      <section className="mb-8">
        <Suspense>
          <ListingFilters />
        </Suspense>
      </section>

      {/* Results count */}
      <div className="mb-4 text-sm text-[var(--color-text-muted)]">
        {totalCount} {totalCount === 1 ? 'listing' : 'listings'} found
      </div>

      {/* Grid */}
      <ListingGrid listings={listings} />

      {/* Pagination */}
      {totalCount > 25 && (
        <nav className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/marketplace?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
            >
              Previous
            </Link>
          )}
          {page * 25 < totalCount && (
            <Link
              href={`/marketplace?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
