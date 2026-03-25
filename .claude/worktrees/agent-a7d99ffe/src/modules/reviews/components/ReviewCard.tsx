import Link from 'next/link'
import { Card, Avatar, Badge } from '@/ui/components'
import type { GearReviewSummary } from '../types'
import { getCategoryLabel, formatRelativeTime } from '../types'
import { StarRating } from './StarRating'

interface ReviewCardProps {
  review: GearReviewSummary
  className?: string
}

export function ReviewCard({ review, className = '' }: ReviewCardProps) {
  const displayName = review.user.name || 'Anonymous'

  return (
    <Card className={`transition-shadow hover:shadow-md ${className}`}>
      <Link href={`/reviews/${review.slug}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Category badge */}
            <Badge variant="info" className="mb-2">
              {getCategoryLabel(review.category)}
            </Badge>

            {/* Title */}
            <h3 className="text-lg font-semibold text-[var(--color-text)] line-clamp-1">
              {review.title}
            </h3>

            {/* Product info */}
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {review.brand} &mdash; {review.productName}
            </p>

            {/* Star rating */}
            <div className="mt-2">
              <StarRating rating={review.rating} size="sm" />
            </div>

            {/* Author and date */}
            <div className="mt-3 flex items-center gap-2">
              <Avatar src={review.user.image} alt={displayName} size="sm" />
              <span className="text-sm text-[var(--color-text-muted)]">
                {displayName}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                &middot; {formatRelativeTime(review.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  )
}
