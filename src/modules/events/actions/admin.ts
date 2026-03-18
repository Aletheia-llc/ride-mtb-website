'use server'

import { auth } from '@/lib/auth/config'
import { pool } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') throw new Error('Forbidden')
}

export async function approveSubmission(eventId: string) {
  await requireAdmin()
  await pool.query(`UPDATE events SET status = 'published', "updatedAt" = NOW() WHERE id = $1`, [eventId])
  revalidatePath('/admin/submissions')
  revalidatePath('/events')
}

export async function rejectSubmission(eventId: string) {
  await requireAdmin()
  await pool.query(`UPDATE events SET status = 'draft', "updatedAt" = NOW() WHERE id = $1`, [eventId])
  revalidatePath('/admin/submissions')
}

export async function verifyOrganizer(organizerId: string) {
  await requireAdmin()
  await pool.query(`UPDATE organizer_profiles SET "isVerified" = true, "updatedAt" = NOW() WHERE id = $1`, [organizerId])
  revalidatePath('/admin/organizers')
}
