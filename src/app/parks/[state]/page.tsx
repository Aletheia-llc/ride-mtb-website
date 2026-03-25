import { notFound } from 'next/navigation'
import { getFacilitiesByState } from '@/modules/parks/actions/facilities'
import { FacilityCard } from '@/modules/parks/components/FacilityCard'
import { FacilityType } from '@/generated/prisma/client'

interface StatePageProps {
  params: Promise<{ state: string }>
  searchParams: Promise<{ type?: string }>
}

const FILTER_LABELS: Record<FacilityType, string> = {
  SKATEPARK: 'Skateparks',
  PUMPTRACK: 'Pump Tracks',
  BIKEPARK: 'Bike Parks',
}

export default async function StatePage({ params, searchParams }: StatePageProps) {
  const { state: stateSlug } = await params
  const { type: typeFilter } = await searchParams

  const validType = typeFilter && Object.values(FacilityType).includes(typeFilter as FacilityType)
    ? (typeFilter as FacilityType)
    : undefined

  const facilities = await getFacilitiesByState(stateSlug, validType)

  if (facilities.length === 0 && !validType) {
    notFound()
  }

  const stateName = facilities[0]?.state ?? stateSlug

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-[var(--color-text-muted)]">
        <a href="/parks" className="hover:text-[var(--color-text)]">Parks</a>
        <span className="mx-2">/</span>
        <span>{stateName}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
        {stateName} — {validType ? FILTER_LABELS[validType] : 'All Facilities'}
      </h1>

      <div className="mb-6 flex gap-2 flex-wrap">
        <a
          href={`/parks/${stateSlug}`}
          className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${!validType ? 'bg-[var(--color-primary)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
        >
          All
        </a>
        {(Object.values(FacilityType) as FacilityType[]).map((t) => (
          <a
            key={t}
            href={`/parks/${stateSlug}?type=${t}`}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${validType === t ? 'bg-[var(--color-primary)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            {FILTER_LABELS[t]}
          </a>
        ))}
      </div>

      {facilities.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No facilities found for this filter.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {facilities.map((f) => (
            <FacilityCard key={f.id} facility={f} />
          ))}
        </div>
      )}
    </div>
  )
}
