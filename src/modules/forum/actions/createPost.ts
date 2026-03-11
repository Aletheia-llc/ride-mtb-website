'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createPost as createPostQuery } from '../lib/queries'

const createPostSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be at most 10,000 characters'),
})

export type CreatePostState = {
  errors: Record<string, string>
  success?: boolean
}

export async function createPost(
  _prevState: CreatePostState,
  formData: FormData,
): Promise<CreatePostState> {
  try {
    const user = await requireAuth()

    const raw = {
      threadId: formData.get('threadId'),
      content: formData.get('content'),
    }

    const parsed = createPostSchema.safeParse(raw)
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

    const { threadId, content } = parsed.data

    await rateLimit({ userId: user.id, action: 'forum-create-post', maxPerMinute: 5 })

    const post = await createPostQuery({
      threadId,
      authorId: user.id,
      content,
    })

    await grantXP({
      userId: user.id,
      event: 'forum_post_created',
      module: 'forum',
      refId: post.id,
    })

    revalidatePath(`/forum/thread/[slug]`, 'page')

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    if (error instanceof Error && error.message.includes('Thread is locked')) {
      return { errors: { general: 'This thread is locked. No new replies can be posted.' } }
    }
    if (error instanceof Error && error.message.includes('Thread not found')) {
      return { errors: { general: 'Thread not found.' } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
