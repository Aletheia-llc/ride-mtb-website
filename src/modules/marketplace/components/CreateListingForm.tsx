'use client'

import { useActionState } from 'react'
import { Input, Button } from '@/ui/components'
import { createListing } from '../actions/createListing'
import { categoryLabels, conditionLabels } from '../types'
import type { ListingCategory, ItemCondition } from '../types'

const categories = Object.entries(categoryLabels) as [ListingCategory, string][]
const conditions = Object.entries(conditionLabels) as [ItemCondition, string][]

export function CreateListingForm() {
  const [state, formAction, isPending] = useActionState(createListing, {
    errors: {} as Record<string, string>,
  })

  return (
    <form action={formAction} className="space-y-5">
      <Input
        label="Title"
        name="title"
        placeholder="e.g. 2024 Santa Cruz Megatower"
        required
        minLength={3}
        maxLength={100}
        error={state.errors?.title}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          minLength={10}
          maxLength={5000}
          placeholder="Describe your item — include details like size, year, condition notes, and any upgrades..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        {state.errors?.description && (
          <p className="text-xs text-red-500">{state.errors.description}</p>
        )}
      </div>

      <Input
        label="Price ($)"
        name="price"
        type="number"
        placeholder="0.00"
        required
        min={0.01}
        step={0.01}
        error={state.errors?.price}
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
          defaultValue=""
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {state.errors?.category && (
          <p className="text-xs text-red-500">{state.errors.category}</p>
        )}
      </div>

      {/* Condition select */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="condition"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Condition
        </label>
        <select
          id="condition"
          name="condition"
          required
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          defaultValue=""
        >
          <option value="" disabled>
            Select condition
          </option>
          {conditions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {state.errors?.condition && (
          <p className="text-xs text-red-500">{state.errors.condition}</p>
        )}
      </div>

      <Input
        label="Location"
        name="location"
        placeholder="e.g. Denver, CO"
        error={state.errors?.location}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="imageUrls"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Image URLs
        </label>
        <textarea
          id="imageUrls"
          name="imageUrls"
          rows={3}
          placeholder="Paste image URLs, one per line"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          Enter one image URL per line. The first image will be used as the cover.
        </p>
        {state.errors?.imageUrls && (
          <p className="text-xs text-red-500">{state.errors.imageUrls}</p>
        )}
      </div>

      {state.errors?.general && (
        <p className="text-sm text-red-500">{state.errors.general}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          Create Listing
        </Button>
      </div>
    </form>
  )
}
