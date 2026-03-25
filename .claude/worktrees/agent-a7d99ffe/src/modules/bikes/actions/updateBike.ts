'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { updateUserBike } from '../lib/garage-queries'

const updateBikeSchema = z.object({
  bikeId: z.string().min(1, 'Bike ID is required'),
  name: z.string().min(1, 'Name is required').max(100),
  brand: z.string().min(1, 'Brand is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  year: z.coerce.number().int().min(1970).max(2100).optional(),
  category: z.enum([
    'gravel',
    'xc',
    'trail',
    'enduro',
    'downhill',
    'dirt_jump',
    'ebike',
    'other',
  ]),
  wheelSize: z.string().max(20).optional(),
  frameSize: z.string().max(20).optional(),
  weight: z.coerce.number().positive().optional(),
  imageUrl: z.string().url().max(500).optional(),
  isPrimary: z.coerce.boolean().optional(),
  notes: z.string().max(2000).optional(),
})

export type UpdateBikeState = {
  errors: Record<string, string>
  success?: boolean
}

export async function updateBike(
  _prevState: UpdateBikeState,
  formData: FormData,
): Promise<UpdateBikeState> {
  try {
    const user = await requireAuth()

    const raw = {
      bikeId: formData.get('bikeId'),
      name: formData.get('name'),
      brand: formData.get('brand'),
      model: formData.get('model'),
      year: formData.get('year') || undefined,
      category: formData.get('category'),
      wheelSize: formData.get('wheelSize') || undefined,
      frameSize: formData.get('frameSize') || undefined,
      weight: formData.get('weight') || undefined,
      imageUrl: formData.get('imageUrl') || undefined,
      isPrimary: formData.get('isPrimary') === 'on',
      notes: formData.get('notes') || undefined,
    }

    const parsed = updateBikeSchema.safeParse(raw)
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

    const { bikeId, ...data } = parsed.data

    const updated = await updateUserBike(bikeId, user.id, data)

    if (!updated) {
      return { errors: { general: 'Bike not found or you do not own it.' } }
    }

    revalidatePath('/bikes/garage')
    revalidatePath(`/bikes/garage/${bikeId}`)

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
