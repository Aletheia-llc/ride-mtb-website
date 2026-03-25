import Image from 'next/image'

interface Review {
  id: string
  rating: number
  body: string | null
  createdAt: Date
  user: { name: string | null; image: string | null }
}

interface ReviewListProps {
  reviews: Review[]
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No reviews yet. Be the first to share your experience!
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg border border-[var(--color-border)] p-4">
          <div className="mb-2 flex items-center gap-3">
            {review.user.image && (
              <Image
                src={review.user.image}
                alt={review.user.name ?? 'User'}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {review.user.name ?? 'Anonymous'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {new Date(review.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-auto text-sm">
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            </div>
          </div>
          {review.body && (
            <p className="text-sm text-[var(--color-text)]">{review.body}</p>
          )}
        </div>
      ))}
    </div>
  )
}
