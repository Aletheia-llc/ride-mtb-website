'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { deleteUserBike } from '../lib/garage-queries'

export type DeleteBikeState = {
  errors: Record<string, string>
  success?: boolean
}

export async function deleteBike(
  _prevState: DeleteBikeState,
  formData: FormData,
): Promise<DeleteBikeState> {
  try {
    const user = await requireAuth()

    const bikeId = formData.get('bikeId')
    if (!bikeId || typeof bikeId !== 'string') {
      return { errors: { general: 'Bike ID is required.' } }
    }

    const deleted = await deleteUserBike(bikeId, user.id)

    if (!deleted) {
      return { errors: { general: 'Bike not found or you do not own it.' } }
    }

    revalidatePath('/bikes/garage')

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
