'use client'

import { useActionState } from 'react'
import { Button, Input, Card } from '@/ui/components'
import { createEventAction, type CreateEventState } from '@/modules/events'

const eventTypeOptions = [
  { value: 'group_ride', label: 'Group Ride' },
  { value: 'race', label: 'Race' },
  { value: 'skills_clinic', label: 'Skills Clinic' },
  { value: 'trail_work', label: 'Trail Work' },
  { value: 'social', label: 'Social' },
  { value: 'demo_day', label: 'Demo Day' },
  { value: 'other', label: 'Other' },
]

export function CreateEventForm() {
  const [state, action, isPending] = useActionState<CreateEventState, FormData>(
    createEventAction,
    { errors: {} },
  )

  return (
    <Card>
      <form action={action} className="space-y-5">
        {state.errors.general && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {state.errors.general}
          </div>
        )}

        <Input
          label="Event Title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="Saturday Morning Group Ride"
          error={state.errors.title}
        />

        {/* Event Type */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-type" className="text-sm font-medium text-[var(--color-text)]">
            Event Type
          </label>
          <select
            id="event-type"
            name="eventType"
            defaultValue="group_ride"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            {eventTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {state.errors.eventType && (
            <p className="text-xs text-red-500">{state.errors.eventType}</p>
          )}
        </div>

        <Input
          label="Location"
          name="location"
          type="text"
          required
          maxLength={500}
          placeholder="Whistler Mountain Bike Park, BC"
          error={state.errors.location}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start Date & Time"
            name="startDate"
            type="datetime-local"
            required
            error={state.errors.startDate}
          />

          <Input
            label="End Date & Time (optional)"
            name="endDate"
            type="datetime-local"
            error={state.errors.endDate}
          />
        </div>

        <Input
          label="Max Attendees (optional)"
          name="maxAttendees"
          type="number"
          min={1}
          placeholder="e.g. 20"
          error={state.errors.maxAttendees}
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-description" className="text-sm font-medium text-[var(--color-text)]">
            Description (optional)
          </label>
          <textarea
            id="event-description"
            name="description"
            rows={5}
            maxLength={5000}
            placeholder="Tell riders what to expect — difficulty level, what to bring, meeting point details..."
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {state.errors.description && (
            <p className="text-xs text-red-500">{state.errors.description}</p>
          )}
        </div>

        <Button type="submit" loading={isPending}>
          Create Event
        </Button>
      </form>
    </Card>
  )
}
