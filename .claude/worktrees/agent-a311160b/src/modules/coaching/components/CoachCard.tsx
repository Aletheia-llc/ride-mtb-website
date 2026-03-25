import Link from 'next/link'
import { Card, Badge, Avatar } from '@/ui/components'
import type { CoachSummary } from '../types'

interface CoachCardProps {
  coach: CoachSummary
}

export function CoachCard({ coach }: CoachCardProps) {
  return (
    <Link href={`/coaching/${coach.id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start gap-4">
          <Avatar
            src={coach.userImage}
            alt={coach.userName ?? 'Coach'}
            size="lg"
          />

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[var(--color-text)]">
              {coach.userName ?? 'Coach'}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              {coach.title}
            </p>

            {/* Specialties */}
            {coach.specialties.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {coach.specialties.map((specialty) => (
                  <Badge key={specialty} variant="info">
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}

            {/* Rate & location */}
            <div className="mt-3 flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
              {coach.hourlyRate != null && (
                <span className="font-medium text-[var(--color-text)]">
                  ${coach.hourlyRate}/hr
                </span>
              )}
              {coach.location && <span>{coach.location}</span>}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
