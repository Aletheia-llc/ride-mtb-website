'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { createServiceLog } from '../lib/garage-queries'
import { getUserBikeById } from '../lib/garage-queries'

const serviceLogSchema = z.object({
  bikeId: z.string().min(1, 'Bike ID is required'),
  serviceType: z.string().min(1, 'Service type is required').max(100),
  description: z.string().max(2000).optional(),
  cost: z.coerce.number().min(0).optional(),
  serviceDate: z.string().min(1, 'Service date is required').transform((val) => {
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error('Invalid date')
    return date
  }),
  mileage: z.coerce.number().min(0).optional(),
})

export type LogServiceState = {
  errors: Record<string, string>
  success?: boolean
}

export async function logService(
  _prevState: LogServiceState,
  formData: FormData,
): Promise<LogServiceState> {
  try {
    const user = await requireAuth()

    const raw = {
      bikeId: formData.get('bikeId'),
      serviceType: formData.get('serviceType'),
      description: formData.get('description') || undefined,
      cost: formData.get('cost') || undefined,
      serviceDate: formData.get('serviceDate'),
      mileage: formData.get('mileage') || undefined,
    }

    const parsed = serviceLogSchema.safeParse(raw)
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

    const { bikeId } = parsed.data

    // Verify ownership
    const bike = await getUserBikeById(bikeId, user.id)
    if (!bike) {
      return { errors: { general: 'Bike not found or you do not own it.' } }
    }

    await rateLimit({ userId: user.id, action: 'garage-log-service', maxPerMinute: 10 })

    await createServiceLog(parsed.data)

    revalidatePath(`/bikes/garage/${bikeId}`)

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
