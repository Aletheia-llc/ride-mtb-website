import Image from 'next/image'
import { Avatar, Badge } from '@/ui/components'
import type { GearReviewDetail } from '../types'
import { getCategoryLabel } from '../types'
import { StarRating } from './StarRating'

interface ReviewDetailProps {
  review: GearReviewDetail
}

export function ReviewDetail({ review }: ReviewDetailProps) {
  const displayName = review.user.name || 'Anonymous'

  return (
    <article>
      {/* Header */}
      <div className="mb-6">
        <Badge variant="info" className="mb-3">
          {getCategoryLabel(review.category)}
        </Badge>

        <h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          {review.title}
        </h1>

        <p className="mt-2 text-lg text-[var(--color-text-muted)]">
          {review.brand} &mdash; {review.productName}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <StarRating rating={review.rating} size="md" />
          <span className="text-sm font-medium text-[var(--color-text)]">
            {review.rating}/5
          </span>
        </div>

        {/* Author */}
        <div className="mt-4 flex items-center gap-3">
          <Avatar src={review.user.image} alt={displayName} size="md" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {displayName}
            </p>
            <time
              dateTime={new Date(review.createdAt).toISOString()}
              className="text-xs text-[var(--color-text-muted)]"
            >
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
        </div>
      </div>

      {/* Product image */}
      {review.imageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl border border-[var(--color-border)]">
          <Image
            src={review.imageUrl}
            alt={`${review.brand} ${review.productName}`}
            width={800}
            height={450}
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      {/* Pros and Cons */}
      {(review.pros || review.cons) && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {review.pros && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800/40 dark:bg-green-900/10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                Pros
              </h2>
              <div className="whitespace-pre-wrap text-sm text-green-900 leading-relaxed dark:text-green-200">
                {review.pros}
              </div>
            </div>
          )}
          {review.cons && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800/40 dark:bg-red-900/10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Cons
              </h2>
              <div className="whitespace-pre-wrap text-sm text-red-900 leading-relaxed dark:text-red-200">
                {review.cons}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="whitespace-pre-wrap text-[var(--color-text)] leading-relaxed">
        {review.content}
      </div>
    </article>
  )
}
