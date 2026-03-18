import type { EventRsvpData } from '../types'

interface AttendeeRowProps {
  rsvps: Pick<EventRsvpData, 'id' | 'userName' | 'userImage'>[]
  rsvpCount: number
}

export function AttendeeRow({ rsvps, rsvpCount }: AttendeeRowProps) {
  const visible = rsvps.slice(0, 5)
  const overflow = rsvpCount > 5 ? rsvpCount - 5 : 0

  if (rsvpCount === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Be the first to RSVP!</p>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Avatar stack */}
      <div className="flex items-center">
        {visible.map((rsvp, idx) => (
          <div
            key={rsvp.id}
            className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[var(--color-bg)] bg-[var(--color-bg-secondary)]"
            style={{ marginLeft: idx === 0 ? 0 : '-8px', zIndex: visible.length - idx }}
            title={rsvp.userName ?? 'Attendee'}
          >
            {rsvp.userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rsvp.userImage}
                alt={rsvp.userName ?? 'Attendee'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-[var(--color-text-muted)]">
                {(rsvp.userName ?? 'A').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-bg)] bg-[var(--color-bg-secondary)] text-xs font-medium text-[var(--color-text-muted)]"
            style={{ marginLeft: '-8px' }}
          >
            +{overflow}
          </div>
        )}
      </div>

      {/* Count label */}
      <p className="text-sm text-[var(--color-text-muted)]">
        <span className="font-medium text-[var(--color-text)]">{rsvpCount}</span>{' '}
        {rsvpCount === 1 ? 'person' : 'people'} going
      </p>
    </div>
  )
}
