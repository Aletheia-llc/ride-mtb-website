'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const createSchema = z.object({
  bikeId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  intervalType: z.enum(['MILES', 'DAYS', 'HOURS']),
  intervalValue: z.coerce.number().int().min(1),
})

export type MaintenanceState = { errors: Record<string, string>; success?: boolean }

export async function createMaintenanceTask(_prev: MaintenanceState, formData: FormData): Promise<MaintenanceState> {
  try {
    const user = await requireAuth()
    const parsed = createSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid' } }
    const bike = await db.userBike.findFirst({ where: { id: parsed.data.bikeId, userId: user.id } })
    if (!bike) return { errors: { general: 'Bike not found' } }
    await db.maintenanceTask.create({ data: parsed.data })
    revalidatePath(`/bikes/garage/${parsed.data.bikeId}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}

export async function completeMaintenanceTask(taskId: string, currentMileage?: number): Promise<{ success: boolean }> {
  try {
    const user = await requireAuth()
    const task = await db.maintenanceTask.findFirst({
      where: { id: taskId },
      include: { bike: { select: { userId: true } } },
    })
    if (!task || task.bike.userId !== user.id) return { success: false }
    await db.maintenanceTask.update({
      where: { id: taskId },
      data: { lastCompletedAt: new Date(), lastMileage: currentMileage ?? null, isDue: false },
    })
    revalidatePath(`/bikes/garage/${task.bikeId}`)
    return { success: true }
  } catch {
    return { success: false }
  }
}
