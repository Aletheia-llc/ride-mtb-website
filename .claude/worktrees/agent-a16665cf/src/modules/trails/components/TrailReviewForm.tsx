'use client'

import { useActionState, useState } from 'react'
import { Button, Input } from '@/ui/components'
import { submitReview, type SubmitReviewState } from '../actions/submitReview'
import type { TrailReviewData } from '../types'

interface TrailReviewFormProps {
  trailId: string
  existingReview?: TrailReviewData
}

function StarRating({
  value,
  onChange,
  label,
  required = false,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  required?: boolean
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--color-text)]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div
        className="flex gap-1"
        onMouseLeave={() => setHovered(0)}
        role="radiogroup"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-checked={value === star}
            role="radio"
            className="rounded p-0.5 text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <span
              className={
                star <= (hovered || value)
                  ? 'text-yellow-400'
                  : 'text-[var(--color-border)]'
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function TrailReviewForm({
  trailId,
  existingReview,
}: TrailReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [flowRating, setFlowRating] = useState(existingReview?.flowRating ?? 0)
  const [sceneryRating, setSceneryRating] = useState(
    existingReview?.sceneryRating ?? 0,
  )
  const [technicalRating, setTechnicalRating] = useState(
    existingReview?.technicalRating ?? 0,
  )
  const [maintenanceRating, setMaintenanceRating] = useState(
    existingReview?.maintenanceRating ?? 0,
  )

  async function formAction(
    _prevState: SubmitReviewState,
    formData: FormData,
  ): Promise<SubmitReviewState> {
    if (rating < 1) {
      return { errors: { rating: 'Please select an overall rating.' } }
    }

    formData.set('trailId', trailId)
    formData.set('rating', String(rating))
    if (flowRating > 0) formData.set('flowRating', String(flowRating))
    if (sceneryRating > 0) formData.set('sceneryRating', String(sceneryRating))
    if (technicalRating > 0)
      formData.set('technicalRating', String(technicalRating))
    if (maintenanceRating > 0)
      formData.set('maintenanceRating', String(maintenanceRating))

    return submitReview(_prevState, formData)
  }

  const [state, action, isPending] = useActionState(formAction, { errors: {} })

  const isEdit = !!existingReview

  return (
    <form action={action} className="space-y-5">
      <h3 className="text-lg font-semibold text-[var(--color-text)]">
        {isEdit ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      {(state.errors.general || state.errors.rating) && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.errors.general || state.errors.rating}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          Review submitted successfully!
        </div>
      )}

      {/* Overall rating */}
      <StarRating
        value={rating}
        onChange={setRating}
        label="Overall Rating"
        required
      />

      {/* Sub-ratings */}
      <div className="grid grid-cols-2 gap-4">
        <StarRating
          value={flowRating}
          onChange={setFlowRating}
          label="Flow"
        />
        <StarRating
          value={sceneryRating}
          onChange={setSceneryRating}
          label="Scenery"
        />
        <StarRating
          value={technicalRating}
          onChange={setTechnicalRating}
          label="Technical"
        />
        <StarRating
          value={maintenanceRating}
          onChange={setMaintenanceRating}
          label="Maintenance"
        />
      </div>

      {/* Comment */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="review-comment"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Comment
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={4}
          defaultValue={existingReview?.comment ?? ''}
          placeholder="How was your ride?"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </div>

      {/* Ride date & bike type */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Ride Date"
          name="rideDate"
          type="date"
          defaultValue={
            existingReview?.rideDate
              ? new Date(existingReview.rideDate).toISOString().split('T')[0]
              : ''
          }
        />
        <Input
          label="Bike Type"
          name="bikeType"
          placeholder="e.g. Trail, Enduro"
          defaultValue={existingReview?.bikeType ?? ''}
        />
      </div>

      <Button type="submit" loading={isPending}>
        {isEdit ? 'Update Review' : 'Submit Review'}
      </Button>
    </form>
  )
}
