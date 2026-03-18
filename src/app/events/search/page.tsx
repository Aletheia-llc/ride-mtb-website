import Link from 'next/link'
import { searchEvents } from '@/modules/events/lib/queries'
import { EventFilterBar } from '@/modules/events/components/EventFilterBar'
import { EventTypeBadge } from '@/modules/events/components/EventTypeBadge'
import { Suspense } from 'react'

export const metadata = { title: 'Search Events | Ride MTB' }

interface Props {
  searchParams: Promise<{ q?: string; type?: string; free?: string }>
}

export default async function EventsSearchPage({ searchParams }: Props) {
  const params = await searchParams
  const { events } = await searchEvents({
    query: params.q,
    eventType: params.type,
    isFree: params.free === 'true' ? true : undefined,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Find Events</h1>
      <Suspense>
        <EventFilterBar />
      </Suspense>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <Link key={event.id} href={`/events/${event.slug}`}
            className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--color-text)]">{event.title}</p>
                <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                  {new Date(event.startDate).toLocaleDateString()}
                  {event.city && event.state ? ` · ${event.city}, ${event.state}` : ''}
                </p>
              </div>
              <EventTypeBadge eventType={event.eventType} />
            </div>
          </Link>
        ))}
        {events.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No events found.</p>
        )}
      </div>
    </div>
  )
}
