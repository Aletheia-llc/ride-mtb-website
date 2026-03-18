'use server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

// ── Input types ───────────────────────────────────────────────

interface CreateClinicInput {
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  location: string
  latitude?: number
  longitude?: number
  capacity?: number
  costCents?: number
  isFree?: boolean
  calcomLink?: string
}

type UpdateClinicInput = Partial<CreateClinicInput>

// ── Helpers ───────────────────────────────────────────────────

async function getSessionCoachProfile() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const coachProfile = await db.coachProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!coachProfile) throw new Error('No coach profile found')

  return { userId: session.user.id, coachId: coachProfile.id }
}

// ── createClinic ──────────────────────────────────────────────

export async function createClinic(input: CreateClinicInput): Promise<{ slug: string }> {
  const { coachId } = await getSessionCoachProfile()

  const slug =
    input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()

  const clinic = await db.coachingClinic.create({
    data: {
      coachId,
      slug,
      title: input.title,
      description: input.description ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      location: input.location,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      capacity: input.capacity ?? null,
      costCents: input.costCents ?? null,
      isFree: input.isFree ?? false,
      calcomLink: input.calcomLink ?? null,
      status: 'published',
    },
    select: { slug: true },
  })

  revalidatePath('/coaching')
  return { slug: clinic.slug }
}

// ── updateClinic ──────────────────────────────────────────────

export async function updateClinic(clinicId: string, input: UpdateClinicInput): Promise<void> {
  const { coachId } = await getSessionCoachProfile()

  const existing = await db.coachingClinic.findUnique({
    where: { id: clinicId },
    select: { coachId: true },
  })

  if (!existing || existing.coachId !== coachId) {
    throw new Error('Unauthorized')
  }

  await db.coachingClinic.update({
    where: { id: clinicId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.costCents !== undefined && { costCents: input.costCents }),
      ...(input.isFree !== undefined && { isFree: input.isFree }),
      ...(input.calcomLink !== undefined && { calcomLink: input.calcomLink }),
    },
  })

  revalidatePath('/coaching')
}

// ── deleteClinic ──────────────────────────────────────────────

export async function deleteClinic(clinicId: string): Promise<void> {
  const { coachId } = await getSessionCoachProfile()

  const existing = await db.coachingClinic.findUnique({
    where: { id: clinicId },
    select: { coachId: true },
  })

  if (!existing || existing.coachId !== coachId) {
    throw new Error('Unauthorized')
  }

  await db.coachingClinic.delete({
    where: { id: clinicId },
  })

  revalidatePath('/coaching')
}
