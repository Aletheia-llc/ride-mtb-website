import { CoachingClinicCard } from './CoachingClinicCard'
import type { ClinicSummary } from '../types'

interface ClinicListProps {
  clinics: ClinicSummary[]
}

export function ClinicList({ clinics }: ClinicListProps) {
  if (clinics.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        No upcoming clinics
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clinics.map((clinic) => (
        <CoachingClinicCard key={clinic.id} clinic={clinic} />
      ))}
    </div>
  )
}
