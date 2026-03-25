'use client'

import { useState, useTransition } from 'react'
import { submitFacilityReview } from '../actions/reviews'

interface ReviewFormProps {
  facilityId: string
}

export function ReviewForm({ facilityId }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitFacilityReview(facilityId, rating, body || null)
      if (result.success) {
        setSuccess(true)
        setRating(0)
        setBody('')
      } else {
        setError(result.error ?? 'Something went wrong')
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
        <p className="text-sm text-green-700">Review submitted. Thanks for your feedback!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Your Rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="text-2xl leading-none focus:outline-none"
            >
              {star <= (hoveredRating || rating) ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="review-body" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Review (optional)
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Share your experience..."
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
