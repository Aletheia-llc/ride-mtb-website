import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { ListingCard } from '@/modules/marketplace/components/listing/ListingCard'
import { ListingCardSkeleton } from '@/modules/marketplace/components/ui/ListingCardSkeleton'
import type { ListingWithPhotos } from '@/modules/marketplace/types'

interface BrowseGridProps {
  listings: ListingWithPhotos[]
  isLoading?: boolean
}

export function BrowseGrid({ listings, isLoading = false }: BrowseGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-20 text-center">
        <SearchX className="mb-4 h-12 w-12 text-[var(--color-dim)]" />
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">No listings found</h2>
        <p className="mb-6 max-w-sm text-sm text-[var(--color-text-muted)]">
          No listings match your current filters. Try broadening your search or check back later for
          new arrivals.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Clear Filters
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
