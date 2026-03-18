import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'
import type { EventSummary, EventType } from '../types'

const TYPE_LABEL: Record<string, string> = {
  group_ride: 'Group Ride',
  race: 'Race',
  race_xc: 'XC Race',
  race_enduro: 'Enduro Race',
  race_dh: 'DH Race',
  race_marathon: 'Marathon Race',
  race_other: 'Race',
  skills_clinic: 'Skills Clinic',
  clinic: 'Clinic',
  camp: 'Camp',
  trail_work: 'Trail Work',
  social: 'Social',
  expo: 'Expo',
  demo_day: 'Demo Day',
  bike_park_day: 'Bike Park Day',
  virtual_challenge: 'Virtual Challenge',
  other: 'Event',
}

interface RelatedEventsProps {
  events: EventSummary[]
  eventType: EventType
}

export function RelatedEvents({ events, eventType }: RelatedEventsProps) {
  if (events.length === 0) return null

  const typeLabel = TYPE_LABEL[eventType] ?? 'Event'

  return (
    <section className="py-8">
      <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
        More {typeLabel} Events
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="group flex w-64 shrink-0 flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-secondary)]"
          >
            {event.imageUrl && (
              <div className="overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <p className="line-clamp-2 text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
              {event.title}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {new Date(event.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
