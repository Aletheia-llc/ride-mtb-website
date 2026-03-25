'use client'

import { useActionState } from 'react'
import { Button, Input } from '@/ui/components'
import { addBike, type AddBikeState } from '../../actions/addBike'
import { updateBike, type UpdateBikeState } from '../../actions/updateBike'
import type { UserBikeData } from '../../types/garage'

interface BikeFormProps {
  bike?: UserBikeData
}

const categories = [
  { value: 'gravel', label: 'Gravel' },
  { value: 'xc', label: 'XC' },
  { value: 'trail', label: 'Trail' },
  { value: 'enduro', label: 'Enduro' },
  { value: 'downhill', label: 'Downhill' },
  { value: 'dirt_jump', label: 'Dirt Jump' },
  { value: 'ebike', label: 'E-Bike' },
  { value: 'other', label: 'Other' },
]

export function BikeForm({ bike }: BikeFormProps) {
  const isEdit = !!bike

  const [state, action, isPending] = useActionState<AddBikeState | UpdateBikeState, FormData>(
    isEdit ? updateBike : addBike,
    { errors: {} },
  )

  return (
    <form action={action} className="space-y-5">
      {isEdit && <input type="hidden" name="bikeId" value={bike.id} />}

      {state.errors.general && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.errors.general}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {isEdit ? 'Bike updated successfully!' : 'Bike added successfully!'}
        </div>
      )}

      {/* Name */}
      <Input
        label="Bike Name"
        name="name"
        required
        placeholder='e.g. "My Trail Shredder"'
        defaultValue={bike?.name ?? ''}
        error={state.errors.name}
      />

      {/* Brand & Model */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Brand"
          name="brand"
          required
          placeholder="e.g. Santa Cruz"
          defaultValue={bike?.brand ?? ''}
          error={state.errors.brand}
        />
        <Input
          label="Model"
          name="model"
          required
          placeholder="e.g. Hightower"
          defaultValue={bike?.model ?? ''}
          error={state.errors.model}
        />
      </div>

      {/* Year & Category */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Year"
          name="year"
          type="number"
          min={1970}
          max={2100}
          placeholder="e.g. 2024"
          defaultValue={bike?.year ?? ''}
          error={state.errors.year}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="category"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={bike?.category ?? 'trail'}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {state.errors.category && (
            <p className="text-xs text-red-500">{state.errors.category}</p>
          )}
        </div>
      </div>

      {/* Wheel Size & Frame Size */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Wheel Size"
          name="wheelSize"
          placeholder='e.g. 29", 27.5", mixed'
          defaultValue={bike?.wheelSize ?? ''}
          error={state.errors.wheelSize}
        />
        <Input
          label="Frame Size"
          name="frameSize"
          placeholder="e.g. Large, XL"
          defaultValue={bike?.frameSize ?? ''}
          error={state.errors.frameSize}
        />
      </div>

      {/* Weight */}
      <Input
        label="Weight (lbs)"
        name="weight"
        type="number"
        step="0.1"
        min={0}
        placeholder="e.g. 30.5"
        defaultValue={bike?.weight ?? ''}
        error={state.errors.weight}
      />

      {/* Image URL */}
      <Input
        label="Image URL"
        name="imageUrl"
        type="url"
        placeholder="https://..."
        defaultValue={bike?.imageUrl ?? ''}
        error={state.errors.imageUrl}
      />

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="notes"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={bike?.notes ?? ''}
          placeholder="Any notes about your bike..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        {state.errors.notes && (
          <p className="text-xs text-red-500">{state.errors.notes}</p>
        )}
      </div>

      {/* Primary toggle */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isPrimary"
          defaultChecked={bike?.isPrimary ?? false}
          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--color-text)]">
          Set as primary bike
        </span>
      </label>

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          {isEdit ? 'Update Bike' : 'Add Bike'}
        </Button>
      </div>
    </form>
  )
}
