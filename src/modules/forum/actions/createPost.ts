'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createPost as createPostQuery } from '../lib/queries'
// eslint-disable-next-line no-restricted-imports
import { db } from '../../../lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { sendReplyNotification, sendMentionNotification } from '../lib/email'
// eslint-disable-next-line no-restricted-imports
import { checkAndGrantBadges } from '../lib/badges'
// eslint-disable-next-line no-restricted-imports
import { createForumNotification, extractMentions } from '../lib/notifications'

const createPostSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be at most 10,000 characters'),
  parentId: z.string().optional(),
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
      parentId: formData.get('parentId') ?? undefined,
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

    const { threadId, content, parentId } = parsed.data

    await rateLimit({ userId: user.id, action: 'forum-create-post', maxPerMinute: 5 })

    const post = await createPostQuery({
      threadId,
      authorId: user.id,
      content,
      parentId,
    })

    await grantXP({
      userId: user.id,
      event: 'forum_post_created',
      module: 'forum',
      refId: post.id,
    })

    revalidatePath(`/forum/thread/[slug]`, 'page')

    // Badge check (fire-and-forget)
    void checkAndGrantBadges(user.id, 'post').catch(console.error)

    // Email notifications (fire-and-forget)
    void (async () => {
      try {
        const thread = await db.forumThread.findUnique({
          where: { id: threadId },
          select: {
            title: true,
            slug: true,
            posts: {
              where: { isFirst: true },
              select: { authorId: true },
              take: 1,
            },
          },
        })
        const threadAuthorId = thread?.posts[0]?.authorId
        // Reply notification
        if (thread && threadAuthorId && threadAuthorId !== user.id) {
          const threadAuthor = await db.user.findUnique({
            where: { id: threadAuthorId },
            select: { email: true, name: true, emailNotifications: true },
          })
          if (threadAuthor) {
            sendReplyNotification({
              toEmail: threadAuthor.email,
              toName: threadAuthor.name,
              replierName: user.name ?? user.email ?? 'Someone',
              threadTitle: thread.title,
              threadSlug: thread.slug,
              emailNotifications: threadAuthor.emailNotifications,
            }).catch(console.error)
          }
        }
        // @mention notifications
        const mentionRegex = /@([a-zA-Z0-9_-]+)/g
        const mentionedUsernames = [...content.matchAll(mentionRegex)].map((m) => m[1])
        if (mentionedUsernames.length > 0 && thread) {
          const mentionedUsers = await db.user.findMany({
            where: { username: { in: mentionedUsernames }, NOT: { id: user.id } },
            select: { email: true, name: true, emailNotifications: true },
          })
          for (const mentionedUser of mentionedUsers) {
            sendMentionNotification({
              toEmail: mentionedUser.email,
              toName: mentionedUser.name,
              mentionerName: user.name ?? user.email ?? 'Someone',
              threadTitle: thread.title,
              threadSlug: thread.slug,
              emailNotifications: mentionedUser.emailNotifications,
            }).catch(console.error)
          }
        }

        // ── In-app notifications ────────────────────────────
        // REPLY_TO_THREAD: notify thread author
        if (thread && threadAuthorId && threadAuthorId !== user.id) {
          await createForumNotification({
            type: 'REPLY_TO_THREAD',
            userId: threadAuthorId,
            actorId: user.id,
            threadId,
            postId: post.id,
          })
        }

        // REPLY_TO_POST: notify parent post author (for nested replies)
        if (parentId) {
          const parentPost = await db.forumPost.findUnique({
            where: { id: parentId },
            select: { authorId: true },
          })
          if (parentPost && parentPost.authorId !== user.id) {
            await createForumNotification({
              type: 'REPLY_TO_POST',
              userId: parentPost.authorId,
              actorId: user.id,
              threadId,
              postId: post.id,
            })
          }
        }

        // MENTION: notify @mentioned users (in-app, using extractMentions)
        const mentionedUsernamesForNotif = extractMentions(content)
        if (mentionedUsernamesForNotif.length > 0 && thread) {
          const mentionedUsersForNotif = await db.user.findMany({
            where: { username: { in: mentionedUsernamesForNotif }, NOT: { id: user.id } },
            select: { id: true },
          })
          for (const mentioned of mentionedUsersForNotif) {
            await createForumNotification({
              type: 'MENTION',
              userId: mentioned.id,
              actorId: user.id,
              threadId,
              postId: post.id,
            })
          }
        }
      } catch {
        // notifications are best-effort
      }
    })()

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
    if (error instanceof Error && error.message.includes('Maximum reply depth')) {
      return { errors: { general: 'You cannot reply this deep in a thread.' } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
