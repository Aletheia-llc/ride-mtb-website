import { EmptyState } from '@/ui/components'
import type { MediaItemData } from '../types'
import { MediaCard } from './MediaCard'

interface MediaGridProps {
  items: MediaItemData[]
  totalCount: number
}

export function MediaGrid({ items, totalCount }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No media yet"
        description="Be the first to share a photo or video from the trails."
      />
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {totalCount} {totalCount === 1 ? 'item' : 'items'}
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
