import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { RSVPButton } from '@/modules/events'
import type { RsvpStatus } from '@/modules/events'
// eslint-disable-next-line no-restricted-imports
import { getEventBySlug, getEventComments, getRelatedEvents } from '@/modules/events/lib/queries'
import { EventCommentSection } from '@/modules/events/components/EventCommentSection'
import { EventCountdownBadge } from '@/modules/events/components/EventCountdownBadge'
import { EventHero } from '@/modules/events/components/EventHero'
import { EventInfoGrid } from '@/modules/events/components/EventInfoGrid'
import { IcalDownload } from '@/modules/events/components/IcalDownload'
import { ResultsBanner } from '@/modules/events/components/ResultsBanner'
import { AttendeeRow } from '@/modules/events/components/AttendeeRow'
import { RelatedEvents } from '@/modules/events/components/RelatedEvents'

interface EventPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) {
    return { title: 'Event Not Found | Ride MTB' }
  }

  return {
    title: `${event.title} | Ride MTB`,
    description:
      event.shortDescription ??
      event.description?.slice(0, 160) ??
      `${event.title} — ${event.location}`,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()])

  if (!event) {
    notFound()
  }

  const [comments, relatedEvents] = await Promise.all([
    getEventComments(event.id),
    getRelatedEvents(slug, event.eventType),
  ])

  const currentUserId = session?.user?.id
  const userRsvp = currentUserId
    ? event.rsvps.find((r) => r.userId === currentUserId)
    : null
  const currentStatus: RsvpStatus | null = userRsvp?.status ?? null

  const goingRsvps = event.rsvps.filter((r) => r.status === 'going')

  return (
    <div>
      {/* Hero — full width, outside the centered wrapper */}
      <EventHero event={event} />

      {/* Main content */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/events"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {/* Countdown badge */}
        <div className="mb-4">
          <EventCountdownBadge startDate={event.startDate} />
        </div>

        {/* Results banner (only when results are posted) */}
        {event.resultsPosted && (
          <div className="mb-4">
            <ResultsBanner resultsUrl={event.resultsUrl} />
          </div>
        )}

        {/* Short description */}
        {event.shortDescription && (
          <p className="mb-6 text-base text-[var(--color-text-muted)]">{event.shortDescription}</p>
        )}

        {/* Info grid: dates, location, registration, organizer */}
        <div className="mb-6">
          <EventInfoGrid event={event} />
        </div>

        {/* Full description */}
        {event.description && (
          <div className="mb-6">
            <h2 className="mb-3 text-xl font-bold text-[var(--color-text)]">About</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
              {event.description}
            </div>
          </div>
        )}

        {/* Add to calendar */}
        <div className="mb-6">
          <IcalDownload slug={event.slug} />
        </div>

        {/* Attendee row */}
        <div className="mb-6">
          <AttendeeRow rsvps={goingRsvps} rsvpCount={event.rsvpCount} />
        </div>

        {/* RSVP section */}
        {currentUserId && (
          <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">
              {currentStatus ? 'Update your RSVP' : 'Will you be there?'}
            </h2>
            <RSVPButton eventId={event.id} currentStatus={currentStatus} />
          </div>
        )}

        {!currentUserId && (
          <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              <Link href="/signin" className="font-medium text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>{' '}
              to RSVP to this event.
            </p>
          </div>
        )}

        {/* Comments */}
        <EventCommentSection eventId={event.id} comments={comments} />
      </div>

      {/* Related events — full content width at bottom */}
      <div className="mx-auto max-w-3xl px-4">
        <RelatedEvents events={relatedEvents} eventType={event.eventType} />
      </div>
    </div>
  )
}
