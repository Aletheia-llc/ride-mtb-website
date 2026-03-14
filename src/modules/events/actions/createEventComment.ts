'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  eventId: z.string().min(1),
  body: z.string().min(1).max(2000),
  parentId: z.string().optional(),
})

export type CommentState = { errors: Record<string, string>; success?: boolean }

export async function createEventComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid' } }
    const event = await db.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true } })
    if (!event) return { errors: { general: 'Event not found' } }
    await db.eventComment.create({ data: { ...parsed.data, userId: user.id } })
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
