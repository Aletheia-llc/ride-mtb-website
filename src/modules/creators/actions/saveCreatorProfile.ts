'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

export type SaveCreatorProfileState = {
  errors: Record<string, string>
  success?: boolean
}

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters'),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  youtubeChannelUrl: z.string().max(200).optional(),
  licensingAttested: z.literal('true', {
    errorMap: () => ({ message: 'You must agree to the content licensing terms to continue.' }),
  }),
})

export async function saveCreatorProfile(
  _prevState: SaveCreatorProfileState,
  formData: FormData,
): Promise<SaveCreatorProfileState> {
  try {
    const user = await requireAuth()

    const profile = await db.creatorProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      return { errors: { general: 'Creator profile not found. Please use your invite link again.' } }
    }

    const raw = {
      displayName: formData.get('displayName') as string | null,
      bio: (formData.get('bio') as string | null) ?? undefined,
      youtubeChannelUrl: (formData.get('youtubeChannelUrl') as string | null) ?? undefined,
      licensingAttested: formData.get('licensingAttested') as string | null,
    }

    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString() ?? 'form'
        errors[field] = issue.message
      }
      return { errors }
    }

    const { displayName, bio, youtubeChannelUrl } = parsed.data

    await db.creatorProfile.update({
      where: { userId: user.id },
      data: {
        displayName,
        ...(bio !== undefined && { bio }),
        ...(youtubeChannelUrl && { youtubeChannelId: youtubeChannelUrl }),
        licensingAttestedAt: new Date(),
      },
    })

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
