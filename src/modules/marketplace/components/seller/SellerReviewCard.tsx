import Image from 'next/image'
import { Star } from 'lucide-react'
import type { SellerReviewWithBuyer } from '@/modules/marketplace/types'

const TAG_LABELS: Record<string, string> = {
  'fast-shipping': 'Fast Shipping',
  'as-described': 'As Described',
  'great-communication': 'Great Communication',
  'good-packaging': 'Good Packaging',
  'fair-price': 'Fair Price',
}

function timeAgo(date: Date | string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(days / 365)
  return `${years}y ago`
}

export function SellerReviewCard({ review }: { review: SellerReviewWithBuyer }) {
  const buyer = review.buyer
  const displayName = buyer.name ?? 'Anonymous'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {/* Header: buyer avatar + name + stars + date */}
      <div className="flex items-start gap-3">
        {buyer.image ? (
          <Image
            src={buyer.image}
            alt={displayName}
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-[var(--color-text)]">
              {displayName}
            </span>
            <span className="shrink-0 text-xs text-[var(--color-dim)]">
              {timeAgo(review.createdAt)}
            </span>
          </div>

          {/* Stars */}
          <div className="mt-0.5 flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < review.rating
                    ? 'fill-amber-500 text-amber-500'
                    : 'text-[var(--color-border)]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      {review.body && (
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {review.body}
        </p>
      )}

      {/* Tags */}
      {review.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]"
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
