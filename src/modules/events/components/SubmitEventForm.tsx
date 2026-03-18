'use client'

import { useState } from 'react'
import { LocationPicker } from './LocationPicker'
import { submitEvent } from '../actions/submit'

export function SubmitEventForm() {
  const [location, setLocation] = useState<{ address: string; latitude: number | null; longitude: number | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      const title = fd.get('title') as string
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
      await submitEvent({
        title,
        slug,
        description: fd.get('description') as string || undefined,
        startDate: new Date(fd.get('startDate') as string),
        eventType: fd.get('eventType') as string,
        location: location?.address,
        isFree: fd.get('isFree') === 'on',
        registrationUrl: fd.get('registrationUrl') as string || undefined,
      })
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) return <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Event submitted for review! We&apos;ll publish it within 24 hours.</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Event Title *</label>
        <input name="title" required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Event Type *</label>
        <select name="eventType" required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm">
          <option value="group_ride">Group Ride</option>
          <option value="race_xc">XC Race</option>
          <option value="race_enduro">Enduro Race</option>
          <option value="race_dh">DH Race</option>
          <option value="clinic">Clinic</option>
          <option value="trail_work">Trail Work</option>
          <option value="social">Social</option>
          <option value="expo">Expo / Demo</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Start Date *</label>
        <input name="startDate" type="date" required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Location</label>
        <LocationPicker onLocationChange={setLocation} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea name="description" rows={4} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Registration URL</label>
        <input name="registrationUrl" type="url" className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isFree" type="checkbox" />
        Free event
      </label>
      <button type="submit" disabled={submitting}
        className="w-full rounded bg-[var(--color-primary)] py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Submit Event'}
      </button>
    </form>
  )
}
