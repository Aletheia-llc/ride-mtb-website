'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createThread as createThreadQuery } from '../lib/queries'
// eslint-disable-next-line no-restricted-imports
import { db } from '../../../lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { checkAndGrantBadges } from '../lib/badges'
// eslint-disable-next-line no-restricted-imports
import { resolveContentLinkPreview } from '../lib/link-preview'

const createThreadSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  categorySlug: z.string().min(1),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be at most 10,000 characters'),
})

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}

export type CreateThreadState = {
  errors: Record<string, string>
  success?: boolean
  redirect?: string
}

export async function createThread(
  _prevState: CreateThreadState,
  formData: FormData,
): Promise<CreateThreadState> {
  let redirectUrl: string | null = null

  try {
    const user = await requireAuth()

    const raw = {
      categoryId: formData.get('categoryId'),
      categorySlug: formData.get('categorySlug'),
      title: formData.get('title'),
      content: formData.get('content'),
    }

    const parsed = createThreadSchema.safeParse(raw)
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

    const { categoryId, title, content } = parsed.data

    await rateLimit({ userId: user.id, action: 'forum-create-thread', maxPerMinute: 3 })

    const slug = generateSlug(title)

    const thread = await createThreadQuery({
      categoryId,
      title,
      slug,
      authorId: user.id,
      content,
    })

    // Link preview (fire-and-forget)
    void resolveContentLinkPreview(content).then(async (result) => {
      if (result) {
        await db.forumThread.update({
          where: { id: thread.id },
          data: { linkPreviewUrl: result.url },
        }).catch(() => {})
      }
    }).catch(() => {})

    await grantXP({
      userId: user.id,
      event: 'forum_thread_created',
      module: 'forum',
      refId: thread.id,
    })

    redirectUrl = `/forum/thread/${thread.slug}`

    // Badge check (fire-and-forget)
    void checkAndGrantBadges(user.id, 'thread').catch(console.error)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    if (error instanceof Error && error.message.includes('Category not found')) {
      return { errors: { general: 'Category not found' } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }

  // redirect() throws internally — must be called outside try/catch
  redirect(redirectUrl)
}
