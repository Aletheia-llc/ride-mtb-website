'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  trailId: z.string().optional(),
  trailSystemId: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1).optional(),
  distanceMi: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  rideDate: z.string().optional(),
})

export type LogRideState = { errors: Record<string, string>; success?: boolean }

export async function logTrailRide(_prev: LogRideState, formData: FormData): Promise<LogRideState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid' } }
    await db.rideLog.create({
      data: {
        userId: user.id,
        trailId: parsed.data.trailId,
        trailSystemId: parsed.data.trailSystemId,
        duration: parsed.data.durationMinutes,
        notes: parsed.data.notes,
        date: parsed.data.rideDate ? new Date(parsed.data.rideDate) : new Date(),
      },
    })
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
