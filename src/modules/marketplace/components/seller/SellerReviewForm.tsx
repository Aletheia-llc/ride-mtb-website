'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { submitSellerReview } from '@/modules/marketplace/actions/seller'

const REVIEW_TAGS = [
  { value: 'fast-shipping', label: 'Fast Shipping' },
  { value: 'as-described', label: 'As Described' },
  { value: 'great-communication', label: 'Great Communication' },
  { value: 'good-packaging', label: 'Good Packaging' },
  { value: 'fair-price', label: 'Fair Price' },
] as const

interface SellerReviewFormProps {
  sellerId: string
  listingId: string
  onSuccess?: () => void
}

export function SellerReviewForm({
  sellerId,
  listingId,
  onSuccess,
}: SellerReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [body, setBody] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (rating === 0) {
      setError('Please select a rating.')
      return
    }

    startTransition(async () => {
      try {
        await submitSellerReview(
          sellerId,
          listingId,
          rating,
          body.trim() || undefined,
          selectedTags.length > 0 ? selectedTags : undefined,
        )
        setSuccess(true)
        onSuccess?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit review.')
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 p-4 text-center text-sm text-[var(--color-primary)]">
        Thank you for your review!
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Leave a Review</h3>

      {/* Star rating */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
          Rating
        </label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => {
            const starValue = i + 1
            const isFilled = starValue <= (hoveredRating || rating)
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(0)}
                className="cursor-pointer p-0.5 transition-transform hover:scale-110"
                aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-6 w-6 ${
                    isFilled ? 'fill-amber-500 text-amber-500' : 'text-[var(--color-border)]'
                  }`}
                />
              </button>
            )
          })}
          {rating > 0 && (
            <span className="ml-2 text-sm text-[var(--color-text-muted)]">
              {rating}/5
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mb-4">
        <label
          htmlFor="review-body"
          className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]"
        >
          Review (optional)
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="How was your experience with this seller?"
          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] focus:border-[var(--color-primary)] focus:outline-none"
        />
      </div>

      {/* Tags */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
          Tags (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map(({ value, label }) => {
            const isSelected = selectedTags.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleTag(value)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover,var(--color-border))]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-3 text-sm text-red-500">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="w-full cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
