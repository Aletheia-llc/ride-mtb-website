'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LocationPicker } from '@/modules/events/components/LocationPicker'
import { createClinic, updateClinic } from '../actions/clinics'
import type { ClinicSummary } from '../types'

interface CoachingClinicFormProps {
  coachId: string
  clinic?: ClinicSummary
}

export function CoachingClinicForm({ coachId: _coachId, clinic }: CoachingClinicFormProps) {
  const router = useRouter()
  const [location, setLocation] = useState<{
    address: string
    latitude: number | null
    longitude: number | null
  } | null>(
    clinic
      ? { address: clinic.location, latitude: clinic.latitude, longitude: clinic.longitude }
      : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!clinic

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    const title = fd.get('title') as string
    const description = (fd.get('description') as string) || undefined
    const startDateStr = fd.get('startDate') as string
    const endDateStr = (fd.get('endDate') as string) || undefined
    const capacityStr = (fd.get('capacity') as string) || undefined
    const costDollarsStr = (fd.get('costCents') as string) || undefined
    const isFree = fd.get('isFree') === 'on'
    const calcomLink = (fd.get('calcomLink') as string) || undefined

    const startDate = new Date(startDateStr)
    const endDate = endDateStr ? new Date(endDateStr) : undefined
    const capacity = capacityStr ? parseInt(capacityStr, 10) : undefined
    const costCents = costDollarsStr ? Math.round(parseFloat(costDollarsStr) * 100) : undefined

    try {
      if (isEdit) {
        await updateClinic(clinic.id, {
          title,
          description,
          startDate,
          endDate,
          location: location?.address ?? clinic.location,
          latitude: location?.latitude ?? clinic.latitude ?? undefined,
          longitude: location?.longitude ?? clinic.longitude ?? undefined,
          capacity,
          costCents,
          isFree,
          calcomLink,
        })
      } else {
        await createClinic({
          title,
          description,
          startDate,
          endDate,
          location: location?.address ?? '',
          latitude: location?.latitude ?? undefined,
          longitude: location?.longitude ?? undefined,
          capacity,
          costCents,
          isFree,
          calcomLink,
        })
      }
      router.push('/coaching/dashboard/clinics')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Title *
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={clinic?.title}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={clinic && 'description' in clinic ? (clinic as { description?: string | null }).description ?? '' : ''}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Start Date *
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={clinic ? clinic.startDate.toISOString().split('T')[0] : ''}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            End Date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={clinic?.endDate ? clinic.endDate.toISOString().split('T')[0] : ''}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Location
        </label>
        <LocationPicker onLocationChange={setLocation} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            defaultValue={clinic?.capacity ?? ''}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>

        <div>
          <label htmlFor="costCents" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Cost (USD)
          </label>
          <input
            id="costCents"
            name="costCents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={clinic?.costCents ? (clinic.costCents / 100).toFixed(2) : ''}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input
          name="isFree"
          type="checkbox"
          defaultChecked={clinic?.isFree}
          className="rounded border-[var(--color-border)]"
        />
        Free clinic
      </label>

      <div>
        <label htmlFor="calcomLink" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Cal.com Booking Link
        </label>
        <input
          id="calcomLink"
          name="calcomLink"
          type="url"
          placeholder="https://cal.com/yourname/clinic"
          defaultValue={clinic?.calcomLink ?? ''}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
      >
        {submitting ? 'Saving…' : isEdit ? 'Update Clinic' : 'Create Clinic'}
      </button>
    </form>
  )
}
