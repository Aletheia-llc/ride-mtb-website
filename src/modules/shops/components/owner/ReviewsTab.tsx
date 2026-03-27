'use client'
import { useState, useEffect, useActionState } from 'react'
import type { ResponseState } from '../../actions/respondToReview'

interface Review {
  id: string
  user: { name: string | null }
  overallRating: number
  title: string | null
  body: string
  ownerResponse: string | null
  createdAt: Date
}

interface Props {
  reviews: Review[]
  replyAction: (prev: ResponseState, formData: FormData) => Promise<ResponseState>
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function ReviewRow({ review, replyAction }: { review: Review; replyAction: Props['replyAction'] }) {
  const [showForm, setShowForm] = useState(false)
  const [state, action, pending] = useActionState(replyAction, { errors: {} })

  useEffect(() => {
    if (state.success) setShowForm(false)
  }, [state.success])

  return (
    <div className="border-b border-[var(--color-border)] pb-6 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sm">{review.user.name ?? 'Anonymous'}</p>
          <StarRating rating={review.overallRating} />
          <p className="text-xs text-[var(--color-text-muted)]">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      {review.title && <p className="mt-2 font-medium text-sm">{review.title}</p>}
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{review.body}</p>

      {review.ownerResponse ? (
        <div className="mt-3 rounded bg-[var(--color-surface-raised)] p-3">
          <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Your response:</p>
          <p className="text-sm">{review.ownerResponse}</p>
        </div>
      ) : (
        <>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
            >
              Reply to this review
            </button>
          )}
          {showForm && (
            <form action={action} className="mt-3 space-y-2">
              <input type="hidden" name="reviewId" value={review.id} />
              <textarea
                name="ownerResponse"
                className="input w-full min-h-[80px] text-sm"
                placeholder="Write a professional response…"
                required
              />
              {state.errors.general && <p className="text-red-600 text-xs">{state.errors.general}</p>}
              {state.success && <p className="text-green-600 text-xs">Response saved.</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="btn btn-primary text-xs py-1 px-3">
                  {pending ? 'Saving…' : 'Post Response'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn text-xs py-1 px-3">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}

export function ReviewsTab({ reviews, replyAction }: Props) {
  if (reviews.length === 0) {
    return <p className="text-[var(--color-text-muted)] text-sm">No reviews yet.</p>
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <ReviewRow key={review.id} review={review} replyAction={replyAction} />
      ))}
    </div>
  )
}
