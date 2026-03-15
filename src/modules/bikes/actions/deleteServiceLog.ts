'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { deleteServiceLog } from '../lib/garage-queries'

export type DeleteServiceLogState = { errors: Record<string, string>; success?: boolean }

export async function deleteServiceLogAction(logId: string, bikeId: string): Promise<DeleteServiceLogState> {
  if (!logId) return { errors: { general: 'Log ID is required' } }

  const user = await requireAuth()

  try {
    const deleted = await deleteServiceLog(logId, user.id)
    if (!deleted) return { errors: { general: 'Service log not found or you do not own it' } }
    revalidatePath(`/bikes/garage/${bikeId}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
