import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db/client'

type NotificationType = 'REPLY_TO_THREAD' | 'REPLY_TO_POST' | 'MENTION' | 'VOTE_MILESTONE'

interface CreateNotificationInput {
  type: NotificationType
  userId: string          // recipient
  actorId?: string        // who triggered it (undefined for system)
  threadId?: string
  postId?: string
  meta?: Record<string, unknown>
}

/**
 * Creates a ForumNotification if deduplication check passes.
 * Always fire-and-forget — wrap call in void + try/catch.
 */
export async function createForumNotification(input: CreateNotificationInput): Promise<void> {
  const { type, userId, actorId, threadId, postId, meta } = input

  // Never notify yourself
  if (actorId && actorId === userId) return

  // Deduplication: check for existing notification with same key
  if (type === 'VOTE_MILESTONE') {
    // Milestones never re-fire for same threshold — check without time range
    const threshold = (meta as { threshold?: number })?.threshold
    const existing = await db.forumNotification.findFirst({
      where: {
        type: 'VOTE_MILESTONE',
        postId: postId ?? null,
        userId,
      },
      select: { id: true, meta: true },
    })
    // Check threshold in application code (Prisma JSON filters are limited)
    if (existing) {
      const existingMeta = existing.meta as { threshold?: number } | null
      if (existingMeta?.threshold === threshold) return
    }
  } else {
    // For actor-based notifications: dedup within 1 hour
    const oneHourAgo = new Date(Date.now() - 3_600_000)
    const existing = await db.forumNotification.findFirst({
      where: {
        type,
        userId,
        actorId: actorId ?? null,
        ...(threadId ? { threadId } : {}),
        ...(postId ? { postId } : {}),
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
      threadId: threadId ?? null,
      postId: postId ?? null,
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
