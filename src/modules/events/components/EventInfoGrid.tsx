import { Calendar, MapPin, DollarSign, User, CheckCircle, ExternalLink } from 'lucide-react'
import type { EventDetailData } from '../types'

type EventInfoGridProps = {
  event: Pick<
    EventDetailData,
    | 'startDate'
    | 'endDate'
    | 'location'
    | 'latitude'
    | 'longitude'
    | 'isFree'
    | 'registrationUrl'
    | 'resultsPosted'
    | 'resultsUrl'
    | 'organizerName'
    | 'organizerVerified'
  >
}

export function EventInfoGrid({ event }: EventInfoGridProps) {
  const dateLabel = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const timeLabel = new Date(event.startDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  const endTimeLabel = event.endDate
    ? new Date(event.endDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  const mapsUrl =
    event.latitude && event.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Date & Time */}
      <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Date &amp; Time</p>
          <p className="text-sm text-[var(--color-text-muted)]">{dateLabel}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {timeLabel}
            {endTimeLabel && ` – ${endTimeLabel}`}
          </p>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Location</p>
          <p className="text-sm text-[var(--color-text-muted)]">{event.location}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline mt-1"
          >
            View on map
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Registration */}
      <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Registration</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {event.isFree ? 'Free event' : 'Paid event'}
          </p>
          {event.registrationUrl && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline mt-1"
            >
              Register now
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Organizer */}
      {event.organizerName && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <User className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Organizer</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-sm text-[var(--color-text-muted)]">{event.organizerName}</p>
              {event.organizerVerified && (
                <CheckCircle className="h-4 w-4 text-[var(--color-primary)]" aria-label="Verified organizer" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
