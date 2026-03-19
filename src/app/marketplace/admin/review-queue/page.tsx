import { requireAdmin } from '@/lib/auth/guards'
import { getReviewQueue } from '@/modules/marketplace/actions/admin'
import { ReviewQueue } from '@/modules/marketplace/components/admin/ReviewQueue'
import type { AdminListingWithDetails } from '@/modules/marketplace/types'

export const metadata = {
  title: 'Review Queue | Marketplace Admin | Ride MTB',
}

export default async function ReviewQueuePage() {
  await requireAdmin()

  const rawListings = await getReviewQueue()
  const listings = rawListings as unknown as AdminListingWithDetails[]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Review Queue
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {listings.length} listing{listings.length !== 1 ? 's' : ''} pending
          review
        </p>
      </div>
      <ReviewQueue initialListings={listings} />
    </div>
  )
}
