import { FacilityType } from '@/generated/prisma/client'
import type { FacilityWithStats } from '../types'

function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

const TYPE_LABELS: Record<FacilityType, string> = {
  SKATEPARK: 'Skatepark',
  PUMPTRACK: 'Pump Track',
  BIKEPARK: 'Bike Park',
  BIKE_SHOP: 'Bike Shop',
  CAMPGROUND: 'Campground',
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
  const safeWebsite = facility.website ? safeHref(facility.website) : null

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

      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Google Maps
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${facility.latitude},${facility.longitude}&dirflg=d`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Apple Maps
        </a>
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
        {safeWebsite && (
          <div className="flex gap-4 py-2 border-b border-[var(--color-border)]">
            <dt className="w-32 shrink-0 text-sm text-[var(--color-text-muted)]">Website</dt>
            <dd className="text-sm">
              <a href={safeWebsite} target="_blank" rel="noopener noreferrer"
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
