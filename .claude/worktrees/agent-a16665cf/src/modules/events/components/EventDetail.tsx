import { Calendar, MapPin, Users, Tag } from 'lucide-react'
import { Badge, Avatar } from '@/ui/components'
import type { EventDetailData } from '../types'

const eventTypeLabels: Record<string, string> = {
  group_ride: 'Group Ride',
  race: 'Race',
  skills_clinic: 'Skills Clinic',
  trail_work: 'Trail Work',
  social: 'Social',
  demo_day: 'Demo Day',
  other: 'Other',
}

const eventTypeBadgeVariant: Record<string, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  group_ride: 'success',
  race: 'error',
  skills_clinic: 'info',
  trail_work: 'warning',
  social: 'default',
  demo_day: 'info',
  other: 'default',
}

interface EventDetailProps {
  event: EventDetailData
}

export function EventDetail({ event }: EventDetailProps) {
  const goingRsvps = event.rsvps.filter((r) => r.status === 'going')
  const maybeRsvps = event.rsvps.filter((r) => r.status === 'maybe')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Badge variant={eventTypeBadgeVariant[event.eventType] ?? 'default'}>
            {eventTypeLabels[event.eventType] ?? 'Event'}
          </Badge>
          {event.maxAttendees && event.rsvpCount >= event.maxAttendees && (
            <Badge variant="error">Full</Badge>
          )}
        </div>
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          {event.title}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Created by {event.creatorName ?? 'Unknown'} on{' '}
          {new Date(event.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Image */}
      {event.imageUrl && (
        <div className="overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      {/* Event info grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Date & Time */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
          <Calendar className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Date</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {new Date(event.startDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {new Date(event.startDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
              {event.endDate && (
                <>
                  {' - '}
                  {new Date(event.endDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
          <MapPin className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Location</p>
            <p className="text-sm text-[var(--color-text-muted)]">{event.location}</p>
          </div>
        </div>

        {/* Attendees */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
          <Users className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Attendees</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {event.rsvpCount} going
              {event.maxAttendees && ` / ${event.maxAttendees} spots`}
            </p>
          </div>
        </div>

        {/* Event Type */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
          <Tag className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Type</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {eventTypeLabels[event.eventType] ?? 'Event'}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-[var(--color-text)]">About</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
            {event.description}
          </div>
        </div>
      )}

      {/* Attendee lists */}
      {goingRsvps.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-[var(--color-text)]">
            Going ({goingRsvps.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {goingRsvps.map((rsvp) => (
              <div key={rsvp.id} className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5">
                <Avatar src={rsvp.userImage} alt={rsvp.userName ?? 'User'} size="sm" />
                <span className="text-sm text-[var(--color-text)]">
                  {rsvp.userName ?? 'Anonymous'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {maybeRsvps.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-[var(--color-text)]">
            Maybe ({maybeRsvps.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {maybeRsvps.map((rsvp) => (
              <div key={rsvp.id} className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5">
                <Avatar src={rsvp.userImage} alt={rsvp.userName ?? 'User'} size="sm" />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {rsvp.userName ?? 'Anonymous'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
