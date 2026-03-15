'use client'

import { useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { addRiderToEvent } from '@/modules/fantasy/actions/admin/manageEvent'
import type { Rider } from '@/generated/prisma/client'

interface AddRiderToEventFormProps {
  eventId: string
  riders: Rider[]
}

export function AddRiderToEventForm({ eventId, riders }: AddRiderToEventFormProps) {
  const [state, formAction] = useFormState(addRiderToEvent, { errors: {} })
  const [isPending, startTransition] = useTransition()
  const [riderId, setRiderId] = useState('')
  const [price, setPrice] = useState('')

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData)
    })
    if (state.success) {
      setRiderId('')
      setPrice('')
    }
  }

  return (
    <form action={handleSubmit} className="flex gap-3 items-end flex-wrap">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="flex-1 min-w-48">
        <label className="block text-sm font-medium mb-2">Select Rider</label>
        <select
          name="riderId"
          value={riderId}
          onChange={e => setRiderId(e.target.value)}
          disabled={isPending}
          className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] text-sm font-medium disabled:opacity-50"
        >
          <option value="">Choose a rider...</option>
          {riders.map(r => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.nationality})
            </option>
          ))}
        </select>
        {state.errors?.riderId && <p className="text-red-600 text-xs mt-1">{state.errors.riderId}</p>}
      </div>

      <div className="w-40">
        <label className="block text-sm font-medium mb-2">Base Price ($)</label>
        <input
          type="number"
          name="basePriceCents"
          value={price ? Math.round(parseFloat(price) * 100) : ''}
          onChange={e => setPrice(e.target.value)}
          placeholder="300000"
          min="1"
          step="100"
          disabled={isPending}
          className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] text-sm font-mono disabled:opacity-50"
        />
        {state.errors?.basePriceCents && <p className="text-red-600 text-xs mt-1">{state.errors.basePriceCents}</p>}
      </div>

      <button
        type="submit"
        disabled={isPending || !riderId || !price}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
      >
        {isPending ? 'Adding...' : 'Add Rider'}
      </button>

      {state.errors?.general && <p className="text-red-600 text-xs w-full">{state.errors.general}</p>}
      {state.success && <p className="text-green-600 text-xs">Rider added successfully!</p>}
    </form>
  )
}
