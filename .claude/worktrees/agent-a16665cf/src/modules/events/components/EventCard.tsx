import Link from 'next/link'
import { Calendar, MapPin, Users } from 'lucide-react'
import { Card, Badge } from '@/ui/components'
import type { EventSummary } from '../types'

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

interface EventCardProps {
  event: EventSummary
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.slug}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            {/* Title + Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                {event.title}
              </h3>
              <Badge variant={eventTypeBadgeVariant[event.eventType] ?? 'default'}>
                {eventTypeLabels[event.eventType] ?? 'Event'}
              </Badge>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(event.startDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {event.endDate && (
                  <>
                    {' - '}
                    {new Date(event.endDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </>
                )}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>

            {/* RSVP count + Creator */}
            <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {event.rsvpCount} {event.rsvpCount === 1 ? 'rider' : 'riders'} going
              </span>
              {event.creatorName && (
                <span>by {event.creatorName}</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
