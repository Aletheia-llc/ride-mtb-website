import Link from 'next/link'

type EventItem = { id: string; title: string; slug: string; startDate: Date; status: string; _count?: { rsvps?: number } }
type Organizer = { name: string; bio: string | null; isVerified: boolean; events: EventItem[] }

export function OrganizerDashboard({ organizer }: { organizer: Organizer }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-[var(--color-text)]">{organizer.name}</p>
            {organizer.isVerified && <span className="text-xs text-[var(--color-primary)]">&#10003; Verified</span>}
          </div>
        </div>
        {organizer.bio && <p className="mt-2 text-sm text-[var(--color-text-muted)]">{organizer.bio}</p>}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Your Events</h2>
        <Link href="/events/new" className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white">+ New Event</Link>
      </div>

      {organizer.events.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No events yet.</p>
      ) : (
        <div className="space-y-2">
          {organizer.events.map(event => (
            <div key={event.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div>
                <Link href={`/events/${event.slug}`} className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">{event.title}</Link>
                <p className="text-xs text-[var(--color-text-muted)]">{new Date(event.startDate).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${event.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'}`}>
                {event.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
