'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createRideLog } from '../lib/queries'

const logRideSchema = z.object({
  date: z.string().min(1, 'Date is required').transform((val) => {
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error('Invalid date')
    return date
  }),
  duration: z.coerce
    .number()
    .int('Duration must be a whole number')
    .positive('Duration must be positive')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be at most 1,000 characters').optional(),
  trailId: z.string().optional(),
})

export type LogRideState = {
  errors: Record<string, string>
  success?: boolean
}

export async function logRide(
  _prevState: LogRideState,
  formData: FormData,
): Promise<LogRideState> {
  try {
    const user = await requireAuth()

    const raw = {
      date: formData.get('date'),
      duration: formData.get('duration') || undefined,
      notes: formData.get('notes') || undefined,
      trailId: formData.get('trailId') || undefined,
    }

    const parsed = logRideSchema.safeParse(raw)
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

    const { date, duration, notes, trailId } = parsed.data

    await rateLimit({ userId: user.id, action: 'ride-log', maxPerMinute: 10 })

    const rideLog = await createRideLog({
      userId: user.id,
      date,
      duration: typeof duration === 'number' ? duration : undefined,
      notes: notes || undefined,
      trailId: trailId || undefined,
    })

    await grantXP({
      userId: user.id,
      event: 'ride_logged',
      module: 'rides',
      refId: rideLog.id,
    })

    revalidatePath('/rides')

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
