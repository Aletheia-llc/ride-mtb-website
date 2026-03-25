'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { createUserBike } from '../lib/garage-queries'

const bikeSchema = z.object({
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

export type AddBikeState = {
  errors: Record<string, string>
  success?: boolean
}

export async function addBike(
  _prevState: AddBikeState,
  formData: FormData,
): Promise<AddBikeState> {
  try {
    const user = await requireAuth()

    const raw = {
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

    const parsed = bikeSchema.safeParse(raw)
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

    await rateLimit({ userId: user.id, action: 'garage-add-bike', maxPerMinute: 5 })

    await createUserBike({
      userId: user.id,
      ...parsed.data,
    })

    revalidatePath('/bikes/garage')

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
