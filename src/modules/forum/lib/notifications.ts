import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db/client'

type NotificationType = 'REPLY_TO_THREAD' | 'REPLY_TO_POST' | 'MENTION' | 'VOTE_MILESTONE'

interface CreateNotificationInput {
  type: NotificationType
  userId: string
  actorId?: string
  postId?: string     // points to Post (was threadId)
  commentId?: string  // points to Comment (was postId)
  meta?: Record<string, unknown>
}

/**
 * Creates a ForumNotification if deduplication check passes.
 * Always fire-and-forget — wrap call in void + try/catch.
 */
export async function createForumNotification(input: CreateNotificationInput): Promise<void> {
  const { type, userId, actorId, postId, commentId, meta } = input

  // Never notify yourself
  if (actorId && actorId === userId) return

  if (type === 'VOTE_MILESTONE') {
    const threshold = (meta as { threshold?: number })?.threshold
    const existing = await db.forumNotification.findFirst({
      where: { type: 'VOTE_MILESTONE', commentId: commentId ?? null, userId },
      select: { id: true, meta: true },
    })
    if (existing) {
      const existingMeta = existing.meta as { threshold?: number } | null
      if (existingMeta?.threshold === threshold) return
    }
  } else {
    const oneHourAgo = new Date(Date.now() - 3_600_000)
    const existing = await db.forumNotification.findFirst({
      where: {
        type,
        userId,
        actorId: actorId ?? null,
        ...(postId ? { postId } : {}),
        ...(commentId ? { commentId } : {}),
        createdAt: { gte: oneHourAgo },
      },
      select: { id: true },
    })
    if (existing) return
  }

  await db.forumNotification.create({
    data: {
      type,
      userId,
      actorId: actorId ?? null,
      postId: postId ?? null,
      commentId: commentId ?? null,
      meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
      read: false,
    },
  })
}

/**
 * Extracts @username mentions from post content.
 */
export function extractMentions(content: string): string[] {
  return [...content.matchAll(/@([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
}
