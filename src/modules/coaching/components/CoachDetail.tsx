import { Card, Badge, Avatar } from '@/ui/components'
import { BookingButton } from './BookingButton'
import type { CoachDetail as CoachDetailType } from '../types'

interface CoachDetailProps {
  coach: CoachDetailType
}

export function CoachDetailView({ coach }: CoachDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <Avatar
          src={coach.userImage}
          alt={coach.userName ?? 'Coach'}
          size="lg"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {coach.userName ?? 'Coach'}
          </h1>
          <p className="mt-1 text-[var(--color-text-muted)]">{coach.title}</p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
            {coach.hourlyRate != null && (
              <span className="font-medium text-[var(--color-text)]">
                ${coach.hourlyRate}/hr
              </span>
            )}
            {coach.location && <span>{coach.location}</span>}
          </div>
        </div>

        <div className="shrink-0">
          <BookingButton
            calcomLink={coach.calcomLink}
            hourlyRate={coach.hourlyRate}
          />
        </div>
      </div>

      {/* Specialties */}
      {coach.specialties.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
            Specialties
          </h2>
          <div className="flex flex-wrap gap-2">
            {coach.specialties.map((specialty) => (
              <Badge key={specialty} variant="info">
                {specialty}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Bio */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
          About
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
          {coach.bio}
        </p>
      </Card>

      {/* Certifications */}
      {coach.certifications.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
            Certifications
          </h2>
          <ul className="space-y-2">
            {coach.certifications.map((cert) => (
              <li
                key={cert}
                className="flex items-center gap-2 text-sm text-[var(--color-text)]"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                {cert}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
