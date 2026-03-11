import { ShoppingBag } from 'lucide-react'
import { EmptyState } from '@/ui/components'
import type { ListingSummary } from '../types'
import { ListingCard } from './ListingCard'

interface ListingGridProps {
  listings: ListingSummary[]
}

export function ListingGrid({ listings }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <EmptyState
        title="No listings found"
        description="Try adjusting your filters or check back later."
        icon={<ShoppingBag className="h-10 w-10" />}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
