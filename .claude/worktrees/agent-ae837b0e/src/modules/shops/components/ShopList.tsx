import { Store } from 'lucide-react'
import { EmptyState } from '@/ui/components'
import type { ShopSummary } from '../types'
import { ShopCard } from './ShopCard'

interface ShopListProps {
  shops: ShopSummary[]
  totalCount: number
}

export function ShopList({ shops, totalCount }: ShopListProps) {
  if (shops.length === 0) {
    return (
      <EmptyState
        title="No shops found"
        description="Try adjusting your filters or search to find bike shops in your area."
        icon={<Store className="h-10 w-10" />}
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        {totalCount} {totalCount === 1 ? 'shop' : 'shops'} found
      </p>

      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  )
}
