'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { createMediaItem } from '../lib/queries'

const uploadMediaSchema = z.object({
  mediaType: z.enum(['photo', 'video'], {
    error: 'Media type must be photo or video',
  }),
  url: z.string().url('A valid URL is required'),
  title: z.string().max(200, 'Title must be at most 200 characters').optional(),
  description: z
    .string()
    .max(2000, 'Description must be at most 2,000 characters')
    .optional(),
  trailId: z.string().optional(),
})

export type UploadMediaState = {
  errors: Record<string, string>
  success?: boolean
}

export async function uploadMedia(
  _prevState: UploadMediaState,
  formData: FormData,
): Promise<UploadMediaState> {
  try {
    const user = await requireAuth()

    const raw = {
      mediaType: formData.get('mediaType'),
      url: formData.get('url'),
      title: formData.get('title') || undefined,
      description: formData.get('description') || undefined,
      trailId: formData.get('trailId') || undefined,
    }

    const parsed = uploadMediaSchema.safeParse(raw)
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

    const { mediaType, url, title, description, trailId } = parsed.data

    await rateLimit({ userId: user.id, action: 'media-upload', maxPerMinute: 10 })

    await createMediaItem({
      userId: user.id,
      mediaType,
      url,
      title: title || undefined,
      description: description || undefined,
      trailId: trailId || undefined,
    })

    revalidatePath('/media')

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
