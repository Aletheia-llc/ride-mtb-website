'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { isUsernameProfane } from '@/lib/username-filter'

export type SaveStepState = {
  errors: Record<string, string>
  success?: boolean
}

const step1Schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .refine((val) => !isUsernameProfane(val), 'Username contains inappropriate content'),
})

const step2Schema = z.object({
  ridingStyle: z.string().max(50),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
})

const step3Schema = z.object({
  bio: z.string().max(500).optional(),
  // location stores a US zip code (5 digits) validated client-side via Mapbox
  location: z
    .string()
    .regex(/^\d{5}$/, 'Please enter a valid US zip code')
    .optional()
    .or(z.literal('')),
})

const step4Schema = z.object({
  yearStartedRiding: z.coerce.number().int().min(1970).max(2026).optional().nullable(),
  favoriteBike: z.string().max(100).optional(),
  favoriteTrail: z.string().max(100).optional(),
})

function isSkipAction(step: number, formData: FormData): boolean {
  switch (step) {
    case 1:
      return !formData.get('username')
    case 2:
      return !formData.get('ridingStyle') && !formData.get('skillLevel')
    case 3:
      return !formData.get('bio') && !formData.get('location')
    case 4:
      return (
        !formData.get('yearStartedRiding') &&
        !formData.get('favoriteBike') &&
        !formData.get('favoriteTrail')
      )
    case 5:
      return formData.getAll('interests').length === 0
    default:
      return false
  }
}

export async function saveStep(
  step: 1 | 2 | 3 | 4 | 5,
  _prevState: SaveStepState,
  formData: FormData
): Promise<SaveStepState> {
  const user = await requireAuth()

  if (isSkipAction(step, formData)) {
    await db.user.update({
      where: { id: user.id },
      data: { onboardingStep: step + 1 },
    })
    return { errors: {}, success: true }
  }

  try {
    switch (step) {
      case 1: {
        const data = step1Schema.parse({ username: formData.get('username') })

        const existing = await db.user.findUnique({
          where: { username: data.username },
        })
        if (existing && existing.id !== user.id) {
          return { errors: { username: 'Username already taken' } }
        }

        await db.user.update({
          where: { id: user.id },
          data: { username: data.username, onboardingStep: 2 },
        })
        break
      }

      case 2: {
        const data = step2Schema.parse({
          ridingStyle: formData.get('ridingStyle'),
          skillLevel: formData.get('skillLevel'),
        })
        await db.user.update({
          where: { id: user.id },
          data: { ...data, onboardingStep: 3 },
        })
        break
      }

      case 3: {
        const bioRaw = formData.get('bio')
        const locationRaw = formData.get('location')
        const data = step3Schema.parse({
          bio: bioRaw ? (bioRaw as string) : undefined,
          location: locationRaw ? (locationRaw as string) : undefined,
        })
        await db.user.update({
          where: { id: user.id },
          data: { ...data, onboardingStep: 4 },
        })
        break
      }

      case 4: {
        const yearRaw = formData.get('yearStartedRiding')
        const data = step4Schema.parse({
          yearStartedRiding: yearRaw ? (yearRaw as string) : undefined,
          favoriteBike: formData.get('favoriteBike') ?? undefined,
          favoriteTrail: formData.get('favoriteTrail') ?? undefined,
        })
        // Strip undefined values so we don't write null into optional fields
        const updateData: Record<string, unknown> = { onboardingStep: 5 }
        if (data.yearStartedRiding !== undefined && data.yearStartedRiding !== null) {
          updateData.yearStartedRiding = data.yearStartedRiding
        }
        if (data.favoriteBike !== undefined) updateData.favoriteBike = data.favoriteBike
        if (data.favoriteTrail !== undefined) updateData.favoriteTrail = data.favoriteTrail
        await db.user.update({
          where: { id: user.id },
          data: updateData,
        })
        break
      }

      case 5: {
        const interests = formData.getAll('interests') as string[]
        await db.user.update({
          where: { id: user.id },
          data: { interests, onboardingStep: 6 },
        })
        break
      }
    }

    return { errors: {}, success: true }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors: Record<string, string> = {}
      for (const issue of err.issues) {
        const key = issue.path[0]?.toString() ?? 'form'
        errors[key] = issue.message
      }
      return { errors }
    }
    throw err
  }
}
