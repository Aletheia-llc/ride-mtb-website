import { FacilityType } from '@/generated/prisma/client'
import type { FacilityWithStats } from '../types'

const TYPE_LABELS: Record<FacilityType, string> = {
  SKATEPARK: 'Skatepark',
  PUMPTRACK: 'Pump Track',
  BIKEPARK: 'Bike Park',
}

interface FacilityDetailProps {
  facility: FacilityWithStats
}

function DetailRow({ label, value }: { label: string; value: string | null | boolean | undefined }) {
  if (value === null || value === undefined) return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value
  return (
    <div className="flex gap-4 py-2 border-b border-[var(--color-border)]">
      <dt className="w-32 shrink-0 text-sm text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--color-text)]">{display}</dd>
    </div>
  )
}

export function FacilityDetail({ facility }: FacilityDetailProps) {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {TYPE_LABELS[facility.type as FacilityType]}
          </span>
          {facility.avgRating != null && (
            <span className="text-sm text-[var(--color-text-muted)]">
              ★ {facility.avgRating} ({facility.reviewCount} review{facility.reviewCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">{facility.name}</h1>
        {(facility.city || facility.state) && (
          <p className="mt-1 text-[var(--color-text-muted)]">
            {[facility.city, facility.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {facility.description && (
        <p className="mb-6 text-[var(--color-text)]">{facility.description}</p>
      )}

      <dl className="mb-8">
        <DetailRow label="Address" value={facility.address} />
        <DetailRow label="Surface" value={facility.surface} />
        <DetailRow label="Hours" value={facility.openingHours} />
        <DetailRow label="Operator" value={facility.operator} />
        <DetailRow label="Fee" value={facility.fee} />
        <DetailRow label="Lit" value={facility.lit} />
        {facility.website && (
          <div className="flex gap-4 py-2 border-b border-[var(--color-border)]">
            <dt className="w-32 shrink-0 text-sm text-[var(--color-text-muted)]">Website</dt>
            <dd className="text-sm">
              <a href={facility.website} target="_blank" rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline">
                {facility.website}
              </a>
            </dd>
          </div>
        )}
        {facility.phone && (
          <div className="flex gap-4 py-2 border-b border-[var(--color-border)]">
            <dt className="w-32 shrink-0 text-sm text-[var(--color-text-muted)]">Phone</dt>
            <dd className="text-sm">
              <a href={`tel:${facility.phone}`} className="text-[var(--color-primary)] hover:underline">
                {facility.phone}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
