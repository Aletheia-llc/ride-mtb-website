import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { getCoachByUserId } from '@/modules/coaching/lib/queries'
import { CoachingClinicForm } from '@/modules/coaching/components'
import type { ClinicSummary } from '@/modules/coaching/types'

export const metadata: Metadata = { title: 'Edit Clinic | Coach Dashboard | Ride MTB' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClinicPage({ params }: Props) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const coachProfile = await getCoachByUserId(session.user.id)
  if (!coachProfile) redirect('/coaching/apply')

  const raw = await db.coachingClinic.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      startDate: true,
      endDate: true,
      location: true,
      latitude: true,
      longitude: true,
      isFree: true,
      costCents: true,
      capacity: true,
      status: true,
      calcomLink: true,
      coachId: true,
      coach: {
        select: {
          user: { select: { name: true, image: true } },
        },
      },
    },
  })

  if (!raw || raw.coachId !== coachProfile.id) notFound()

  const clinic: ClinicSummary = {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    startDate: raw.startDate,
    endDate: raw.endDate,
    location: raw.location,
    latitude: raw.latitude,
    longitude: raw.longitude,
    isFree: raw.isFree,
    costCents: raw.costCents,
    capacity: raw.capacity,
    status: raw.status,
    calcomLink: raw.calcomLink,
    coachId: raw.coachId,
    coachName: raw.coach.user.name,
    coachImage: raw.coach.user.image,
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-[var(--color-text)]">Edit Clinic</h1>
      <CoachingClinicForm coachId={coachProfile.id} clinic={clinic} />
    </div>
  )
}
