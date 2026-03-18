import type { Metadata } from 'next'
// eslint-disable-next-line no-restricted-imports
import { getUpcomingClinics } from '@/modules/coaching/lib/queries'
import { ClinicList } from '@/modules/coaching/components'

export const metadata: Metadata = {
  title: 'Upcoming Coaching Clinics | Ride MTB',
  description: 'Browse upcoming mountain bike coaching clinics near you.',
}

export default async function ClinicsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ specialty?: string; location?: string }>
}) {
  const { specialty, location } = await searchParams
  const clinics = await getUpcomingClinics({ specialty, location })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Upcoming Coaching Clinics
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Find group clinics and skill sessions led by certified coaches.
      </p>

      <ClinicList clinics={clinics} />
    </div>
  )
}
