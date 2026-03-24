import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getCoachByUserId } from '@/modules/coaching/lib/queries'
import { CoachingClinicForm } from '@/modules/coaching/components'

export const metadata: Metadata = { title: 'New Clinic | Coach Dashboard | Ride MTB' }

export default async function NewClinicPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const coachProfile = await getCoachByUserId(session.user.id)
  if (!coachProfile) redirect('/coaching/apply')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-[var(--color-text)]">Create New Clinic</h1>
      <CoachingClinicForm coachId={coachProfile.id} />
    </div>
  )
}
