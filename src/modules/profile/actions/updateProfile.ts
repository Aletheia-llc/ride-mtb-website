'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { updateProfile as updateProfileQuery } from '../lib/queries'

const updateProfileSchema = z.object({
  name: z
    .string()
    .max(100, 'Name must be at most 100 characters')
    .optional()
    .transform((v) => v || undefined),
  username: z
    .string()
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]*$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional()
    .transform((v) => v || undefined),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional()
    .transform((v) => v || undefined),
  location: z
    .string()
    .max(100, 'Location must be at most 100 characters')
    .optional()
    .transform((v) => v || undefined),
  ridingStyle: z
    .string()
    .max(100, 'Riding style must be at most 100 characters')
    .optional()
    .transform((v) => v || undefined),
  skillLevel: z
    .enum(['beginner', 'intermediate', 'advanced', 'expert', ''])
    .optional()
    .transform((v) => (v === '' ? null : v)),
  favoriteBike: z
    .string()
    .max(100, 'Favorite bike must be at most 100 characters')
    .optional()
    .transform((v) => v || undefined),
  favoriteTrail: z
    .string()
    .max(100, 'Favorite trail must be at most 100 characters')
    .optional()
    .transform((v) => v || undefined),
  yearsRiding: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v === '') return null
      const n = parseInt(v, 10)
      return isNaN(n) ? null : n
    })
    .pipe(z.number().int().min(0).max(99).nullable()),
  websiteUrl: z
    .string()
    .max(200, 'URL must be at most 200 characters')
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
})

export type UpdateProfileState = {
  errors: Record<string, string>
  success?: boolean
}

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  try {
    const user = await requireAuth()

    const raw = {
      name: formData.get('name') as string,
      username: formData.get('username') as string,
      bio: formData.get('bio') as string,
      location: formData.get('location') as string,
      ridingStyle: formData.get('ridingStyle') as string,
      skillLevel: formData.get('skillLevel') as string,
      favoriteBike: formData.get('favoriteBike') as string,
      favoriteTrail: formData.get('favoriteTrail') as string,
      yearsRiding: formData.get('yearsRiding') as string,
      websiteUrl: formData.get('websiteUrl') as string,
    }

    const parsed = updateProfileSchema.safeParse(raw)
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

    await rateLimit({ userId: user.id, action: 'profile-update', maxPerMinute: 5 })

    await updateProfileQuery(user.id, parsed.data)

    revalidatePath('/profile')
    revalidatePath(`/profile/${parsed.data.username}`)

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { errors: { username: 'This username is already taken.' } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
