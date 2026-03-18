import Link from 'next/link'
import type { ClinicSummary } from '../types'

interface CoachingClinicCardProps {
  clinic: ClinicSummary
}

function formatCost(clinic: ClinicSummary): string {
  if (clinic.isFree) return 'Free'
  if (clinic.costCents) return '$' + (clinic.costCents / 100).toFixed(2)
  return 'Contact for pricing'
}

export function CoachingClinicCard({ clinic }: CoachingClinicCardProps) {
  const dateStr = clinic.startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link href={`/coaching/clinics/${clinic.slug}`} className="block">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-shadow hover:shadow-md">
        <h3 className="truncate text-base font-semibold text-[var(--color-text)]">
          {clinic.title}
        </h3>

        <div className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
          <p>{dateStr}</p>
          <p className="truncate">{clinic.location}</p>
          {clinic.coachName && (
            <p>with {clinic.coachName}</p>
          )}
        </div>

        <p className="mt-3 text-sm font-medium text-[var(--color-primary)]">
          {formatCost(clinic)}
        </p>
      </div>
    </Link>
  )
}
