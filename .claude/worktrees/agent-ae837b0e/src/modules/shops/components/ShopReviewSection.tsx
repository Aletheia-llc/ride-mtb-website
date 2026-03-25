'use client'
import { useActionState } from 'react'
import { submitShopReview } from '../actions/submitShopReview'

interface Review {
  id: string
  overallRating: number
  serviceRating: number
  pricingRating: number
  selectionRating: number
  title: string | null
  body: string
  bikeType: string | null
  helpfulCount: number
  createdAt: Date
  user: { name: string | null }
}

interface ShopReviewSectionProps {
  shopId: string
  reviews: Review[]
  avgOverall: number | null
  reviewCount: number
}

type ReviewState = { errors: Record<string, string>; success?: boolean }

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-sm ${i < Math.round(rating) ? 'text-yellow-400' : 'text-[var(--color-border)]'}`}>★</span>
      ))}
    </span>
  )
}

export function ShopReviewSection({ shopId, reviews, avgOverall, reviewCount }: ShopReviewSectionProps) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    submitShopReview as (s: ReviewState, f: FormData) => Promise<ReviewState>,
    { errors: {} },
  )

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Reviews</h2>
        {avgOverall && (
          <div className="flex items-center gap-2">
            <StarRating rating={avgOverall} />
            <span className="text-sm text-[var(--color-text-muted)]">{avgOverall.toFixed(1)} ({reviewCount})</span>
          </div>
        )}
      </div>

      {/* Review form */}
      {!state.success && (
        <form action={formAction} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-4">
          <input type="hidden" name="shopId" value={shopId} />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Write a Review</h3>
          <div className="grid grid-cols-2 gap-4">
            {(['overallRating', 'serviceRating', 'pricingRating', 'selectionRating'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1 capitalize">
                  {field.replace('Rating', '').replace(/([A-Z])/g, ' $1')}
                </label>
                <select name={field} required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </div>
            ))}
          </div>
          <textarea name="body" placeholder="Share your experience (min 10 chars)..." required minLength={10}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] h-24 resize-none" />
          {state.errors.general && <p className="text-xs text-red-500">{state.errors.general}</p>}
          <button type="submit" disabled={pending}
            className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      )}

      {/* Review list */}
      <div className="space-y-4">
        {reviews.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No reviews yet. Be the first!</p>}
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-[var(--color-text)]">{review.user.name ?? 'Anonymous'}</span>
                {review.bikeType && <span className="ml-2 text-xs text-[var(--color-text-muted)]">· {review.bikeType}</span>}
              </div>
              <StarRating rating={review.overallRating} />
            </div>
            <div className="flex gap-4 mb-3">
              {([['Service', review.serviceRating], ['Pricing', review.pricingRating], ['Selection', review.selectionRating]] as [string, number][]).map(([label, val]) => (
                <span key={label} className="text-xs text-[var(--color-text-muted)]">
                  {label}: <span className="text-[var(--color-text)]">{val}★</span>
                </span>
              ))}
            </div>
            {review.title && <p className="text-sm font-medium text-[var(--color-text)] mb-1">{review.title}</p>}
            <p className="text-sm text-[var(--color-text)]">{review.body}</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
