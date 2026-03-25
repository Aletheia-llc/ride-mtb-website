import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { EventDetail, RSVPButton } from '@/modules/events'
import type { RsvpStatus } from '@/modules/events'
// eslint-disable-next-line no-restricted-imports
import { getEventBySlug, getEventComments } from '@/modules/events/lib/queries'
import { EventCommentSection } from '@/modules/events/components/EventCommentSection'
import { EventCountdownBadge } from '@/modules/events/components/EventCountdownBadge'

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
    description: event.description?.slice(0, 160) ?? `${event.title} — ${event.location}`,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const [event, session] = await Promise.all([getEventBySlug(slug), auth()])

  if (!event) {
    notFound()
  }

  const comments = await getEventComments(event.id)

  const currentUserId = session?.user?.id
  const userRsvp = currentUserId
    ? event.rsvps.find((r) => r.userId === currentUserId)
    : null
  const currentStatus: RsvpStatus | null = userRsvp?.status ?? null

  return (
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

      {/* Event detail */}
      <EventDetail event={event} />

      {/* RSVP section */}
      {currentUserId && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">
            {currentStatus ? 'Update your RSVP' : 'Will you be there?'}
          </h2>
          <RSVPButton eventId={event.id} currentStatus={currentStatus} />
        </div>
      )}

      {!currentUserId && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
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
  )
}
