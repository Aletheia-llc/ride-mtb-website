'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  bikeId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  entryDate: z.string().optional(),
})

export type BuildLogState = { errors: Record<string, string>; success?: boolean }

export async function addBuildLogEntry(_prev: BuildLogState, formData: FormData): Promise<BuildLogState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid' } }
    const bike = await db.userBike.findFirst({ where: { id: parsed.data.bikeId, userId: user.id } })
    if (!bike) return { errors: { general: 'Bike not found' } }
    await db.buildLogEntry.create({
      data: {
        ...parsed.data,
        userId: user.id,
        entryDate: parsed.data.entryDate ? new Date(parsed.data.entryDate) : new Date(),
      },
    })
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
