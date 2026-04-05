import Link from 'next/link'
import { FacilityType } from '@/generated/prisma/client'
import type { FacilityPin } from '../types'

const TYPE_LABELS: Record<FacilityType, string> = {
  SKATEPARK: 'Skatepark',
  PUMPTRACK: 'Pump Track',
  BIKEPARK: 'Bike Park',
  BIKE_SHOP: 'Bike Shop',
  CAMPGROUND: 'Campground',
}

const TYPE_COLORS: Record<FacilityType, string> = {
  SKATEPARK: 'text-orange-500',
  PUMPTRACK: 'text-teal-500',
  BIKEPARK: 'text-purple-500',
  BIKE_SHOP: 'text-green-500',
  CAMPGROUND: 'text-amber-600',
}

interface FacilityCardProps {
  facility: FacilityPin
}

export function FacilityCard({ facility }: FacilityCardProps) {
  if (!facility.stateSlug) return null

  return (
    <Link
      href={`/parks/${facility.stateSlug}/${facility.slug}`}
      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-text)] truncate">{facility.name}</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {[facility.city, facility.state].filter(Boolean).join(', ')}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium ${TYPE_COLORS[facility.type as FacilityType]}`}>
          {TYPE_LABELS[facility.type as FacilityType]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        {facility.surface && <span>{facility.surface}</span>}
        {facility.lit && <span>Lit</span>}
        {facility.reviewCount > 0 && facility.avgRating != null && (
          <span>★ {facility.avgRating} ({facility.reviewCount})</span>
        )}
      </div>
    </Link>
  )
}
