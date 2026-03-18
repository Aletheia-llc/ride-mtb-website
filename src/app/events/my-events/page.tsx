import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getMyRsvps } from '@/modules/events/lib/queries'

export const metadata = { title: 'My Events | Ride MTB' }

export default async function MyEventsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const rsvps = await getMyRsvps(session.user.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">My Events</h1>
      {rsvps.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">You haven&apos;t RSVPed to any events yet. <Link href="/events/search" className="text-[var(--color-primary)] hover:underline">Find events</Link>.</p>
      ) : (
        <div className="space-y-3">
          {rsvps.map((rsvp) => (
            <Link key={rsvp.id} href={`/events/${rsvp.event.slug}`}
              className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)]">
              <p className="font-semibold text-[var(--color-text)]">{rsvp.event.title}</p>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                {new Date(rsvp.event.startDate).toLocaleDateString()} · {rsvp.event.city}, {rsvp.event.state}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
