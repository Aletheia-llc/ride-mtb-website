import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { EventList } from '@/modules/events'
import type { EventType } from '@/modules/events'
// eslint-disable-next-line no-restricted-imports
import { getUpcomingEvents } from '@/modules/events/lib/queries'

export const metadata: Metadata = {
  title: 'Events | Ride MTB',
  description: 'Discover upcoming mountain biking events — group rides, races, skills clinics, trail work days, and more.',
}

interface EventsPageProps {
  searchParams: Promise<{ type?: string; q?: string; page?: string }>
}

const validEventTypes: EventType[] = [
  'group_ride',
  'race',
  'skills_clinic',
  'trail_work',
  'social',
  'demo_day',
  'other',
]

const eventTypeLabels: Record<string, string> = {
  group_ride: 'Group Ride',
  race: 'Race',
  skills_clinic: 'Skills Clinic',
  trail_work: 'Trail Work',
  social: 'Social',
  demo_day: 'Demo Day',
  other: 'Other',
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams
  const session = await auth()

  const eventType = validEventTypes.includes(params.type as EventType)
    ? (params.type as EventType)
    : undefined
  const search = params.q || undefined
  const page = Math.max(1, Number(params.page) || 1)

  const { events, totalCount } = await getUpcomingEvents(
    { eventType, search },
    page,
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Events</h1>
          <p className="text-[var(--color-text-muted)]">
            Find and join upcoming mountain biking events near you.
          </p>
        </div>
        {session?.user && (
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            <CalendarPlus className="h-4 w-4" />
            Create Event
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <form className="flex-1" method="GET" action="/events">
          {eventType && <input type="hidden" name="type" value={eventType} />}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search events..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </form>

        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/events${search ? `?q=${search}` : ''}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !eventType
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All
          </Link>
          {validEventTypes.map((type) => (
            <Link
              key={type}
              href={`/events?type=${type}${search ? `&q=${search}` : ''}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                eventType === type
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {eventTypeLabels[type]}
            </Link>
          ))}
        </div>
      </div>

      {/* Event list */}
      <EventList events={events} totalCount={totalCount} />
    </div>
  )
}
