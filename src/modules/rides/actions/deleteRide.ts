'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { deleteRideLog } from '../lib/queries'

export async function deleteRide(rideId: string): Promise<{ success: boolean }> {
  const user = await requireAuth()

  if (!rideId) {
    return { success: false }
  }

  const deleted = await deleteRideLog(rideId, user.id)

  if (deleted) {
    revalidatePath('/rides')
  }

  return { success: deleted }
}
