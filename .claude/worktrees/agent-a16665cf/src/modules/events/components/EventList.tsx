import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { Button, EmptyState } from '@/ui/components'
import type { EventSummary } from '../types'
import { EventCard } from './EventCard'

interface EventListProps {
  events: EventSummary[]
  totalCount: number
}

export function EventList({ events, totalCount }: EventListProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No upcoming events"
        description="Be the first to create an event and rally the riding community."
        icon={<CalendarDays className="h-10 w-10" />}
        action={
          <Link href="/events/new">
            <Button>Create Event</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        {totalCount} upcoming {totalCount === 1 ? 'event' : 'events'}
      </p>

      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
