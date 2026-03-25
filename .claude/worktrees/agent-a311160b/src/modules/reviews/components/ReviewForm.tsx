'use client'

import { useActionState, useState } from 'react'
import { Input, Button } from '@/ui/components'
import { GEAR_CATEGORIES } from '../types'
import { submitReview } from '../actions/submitReview'
import { StarRating } from './StarRating'

export function ReviewForm() {
  const [state, formAction, isPending] = useActionState(submitReview, {
    errors: {} as Record<string, string>,
  })

  const [rating, setRating] = useState(0)

  return (
    <form action={formAction} className="space-y-5">
      <Input
        label="Title"
        name="title"
        placeholder="e.g. Best trail helmet I've owned"
        required
        minLength={3}
        maxLength={100}
        error={state.errors?.title}
      />

      {/* Category select */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="category"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        >
          <option value="">Select a category</option>
          {GEAR_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {state.errors?.category && (
          <p className="text-xs text-red-500">{state.errors.category}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Brand"
          name="brand"
          placeholder="e.g. Fox Racing"
          required
          error={state.errors?.brand}
        />

        <Input
          label="Product Name"
          name="productName"
          placeholder="e.g. Proframe RS"
          required
          error={state.errors?.productName}
        />
      </div>

      {/* Star rating picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">
          Rating
        </label>
        <input type="hidden" name="rating" value={rating} />
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
        {state.errors?.rating && (
          <p className="text-xs text-red-500">{state.errors.rating}</p>
        )}
      </div>

      {/* Pros */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pros"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Pros
        </label>
        <textarea
          id="pros"
          name="pros"
          rows={3}
          placeholder="What did you like about this product?"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        {state.errors?.pros && (
          <p className="text-xs text-red-500">{state.errors.pros}</p>
        )}
      </div>

      {/* Cons */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cons"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Cons
        </label>
        <textarea
          id="cons"
          name="cons"
          rows={3}
          placeholder="What could be improved?"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        {state.errors?.cons && (
          <p className="text-xs text-red-500">{state.errors.cons}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="content"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Full Review
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={8}
          placeholder="Share your detailed experience with this product..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        {state.errors?.content && (
          <p className="text-xs text-red-500">{state.errors.content}</p>
        )}
      </div>

      {/* Image URL (optional) */}
      <Input
        label="Image URL (optional)"
        name="imageUrl"
        type="url"
        placeholder="https://example.com/photo.jpg"
        error={state.errors?.imageUrl}
      />

      {state.errors?.general && (
        <p className="text-sm text-red-500">{state.errors.general}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          Submit Review
        </Button>
      </div>
    </form>
  )
}
