import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { EmptyState, Button } from '@/ui/components'
import type { GearReviewSummary } from '../types'
import { ReviewCard } from './ReviewCard'

interface ReviewListProps {
  reviews: GearReviewSummary[]
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        title="No reviews yet"
        description="Be the first to share your experience with a piece of gear."
        icon={<FileText className="h-12 w-12" />}
        action={
          <Link href="/reviews/new">
            <Button>
              <Plus className="h-4 w-4" />
              Write a Review
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}
