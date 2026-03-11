'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { updateListingStatus } from '../lib/queries'

const statusEnum = z.enum(['active', 'sold', 'reserved', 'expired', 'removed'])

const updateStatusSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  status: statusEnum,
})

export type UpdateStatusState = {
  errors: Record<string, string>
  success?: boolean
}

export async function updateStatus(
  _prevState: UpdateStatusState,
  formData: FormData,
): Promise<UpdateStatusState> {
  try {
    const user = await requireAuth()

    const raw = {
      listingId: formData.get('listingId'),
      status: formData.get('status'),
    }

    const parsed = updateStatusSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { listingId, status } = parsed.data

    await updateListingStatus(listingId, user.id, status)

    revalidatePath('/marketplace')

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return { errors: { general: 'You are not authorized to update this listing.' } }
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return { errors: { general: 'Listing not found.' } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
