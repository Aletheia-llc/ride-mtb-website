'use server'
import { requireAuth } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export interface ApplyState {
  errors: string | null
}

export async function applyToCoachAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await requireAuth()

  const title = (formData.get('title') as string)?.trim()
  const bio = (formData.get('bio') as string)?.trim()
  const hourlyRateRaw = formData.get('hourlyRate') as string
  const location = (formData.get('location') as string)?.trim() || undefined
  const calcomLink = (formData.get('calcomLink') as string)?.trim() || undefined
  const specialtiesRaw = (formData.get('specialties') as string)?.trim()
  const specialties = specialtiesRaw ? specialtiesRaw.split(',').map(s => s.trim()).filter(Boolean) : []

  if (!title) return { errors: 'Title is required' }
  if (!bio || bio.length < 50) return { errors: 'Bio must be at least 50 characters' }

  const hourlyRate = hourlyRateRaw ? parseFloat(hourlyRateRaw) : null

  await db.coachApplication.upsert({
    where: { userId: user.id },
    update: { title, bio, hourlyRate, location, calcomLink, specialties, status: 'pending', reviewNote: null },
    create: { userId: user.id, title, bio, hourlyRate, location, calcomLink, specialties },
  })

  revalidatePath('/coaching/apply')
  redirect('/coaching/apply/submitted')
}
