'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { deleteServiceLog } from '../lib/garage-queries'

export async function deleteServiceLogAction(logId: string, bikeId: string) {
  const user = await requireAuth()

  if (!logId) {
    throw new Error('Log ID is required')
  }

  const deleted = await deleteServiceLog(logId, user.id)

  if (!deleted) {
    throw new Error('Service log not found or you do not own it.')
  }

  revalidatePath(`/bikes/garage/${bikeId}`)
}
