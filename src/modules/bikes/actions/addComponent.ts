'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  bikeId: z.string().min(1),
  category: z.enum(['FRAME','FORK','SHOCK','WHEELS','DRIVETRAIN','BRAKES','COCKPIT','SEATPOST','SADDLE','PEDALS','OTHER']),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1990).max(2030).optional(),
  weightGrams: z.coerce.number().int().min(0).optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
})

export type ComponentState = { errors: Record<string, string>; success?: boolean }

export async function addComponent(_prev: ComponentState, formData: FormData): Promise<ComponentState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid' } }

    // Verify bike belongs to user
    const bike = await db.userBike.findFirst({ where: { id: parsed.data.bikeId, userId: user.id } })
    if (!bike) return { errors: { general: 'Bike not found' } }

    await db.bikeComponent.create({ data: { ...parsed.data } })
    revalidatePath(`/bikes/garage/${parsed.data.bikeId}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
