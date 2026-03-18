'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createCommentRecord } from '../lib/queries'
// eslint-disable-next-line no-restricted-imports
import { db } from '../../../lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { sendReplyNotification, sendMentionNotification } from '../lib/email'
// eslint-disable-next-line no-restricted-imports
import { checkAndAwardBadges } from '../lib/badges'
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

    const { threadId: postId, content, parentId } = parsed.data

    await rateLimit({ userId: user.id, action: 'forum-create-post', maxPerMinute: 5 })

    // Check if post exists and is not locked
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, slug: true, isLocked: true, authorId: true },
    })
    if (!post) throw new Error('Thread not found')
    if (post.isLocked) throw new Error('Thread is locked')

    const comment = await createCommentRecord({
      postId,
      authorId: user.id,
      body: content,
      parentId,
    })

    await grantXP({
      userId: user.id,
      event: 'forum_post_created',
      module: 'forum',
      refId: comment.id,
    })

    revalidatePath(`/forum/thread/[slug]`, 'page')

    // Badge check (fire-and-forget)
    void checkAndAwardBadges(user.id).catch(console.error)

    // Email notifications (fire-and-forget)
    void (async () => {
      try {
        const postAuthorId = post.authorId
        // Reply notification
        if (postAuthorId && postAuthorId !== user.id) {
          const postAuthor = await db.user.findUnique({
            where: { id: postAuthorId },
            select: { email: true, name: true, emailNotifications: true },
          })
          if (postAuthor) {
            sendReplyNotification({
              toEmail: postAuthor.email,
              toName: postAuthor.name,
              replierName: user.name ?? user.email ?? 'Someone',
              threadTitle: post.title,
              threadSlug: post.slug,
              emailNotifications: postAuthor.emailNotifications,
            }).catch(console.error)
          }
        }
        // @mention notifications
        const mentionRegex = /@([a-zA-Z0-9_-]+)/g
        const mentionedUsernames = [...content.matchAll(mentionRegex)].map((m) => m[1])
        if (mentionedUsernames.length > 0) {
          const mentionedUsers = await db.user.findMany({
            where: { username: { in: mentionedUsernames }, NOT: { id: user.id } },
            select: { email: true, name: true, emailNotifications: true },
          })
          for (const mentionedUser of mentionedUsers) {
            sendMentionNotification({
              toEmail: mentionedUser.email,
              toName: mentionedUser.name,
              mentionerName: user.name ?? user.email ?? 'Someone',
              threadTitle: post.title,
              threadSlug: post.slug,
              emailNotifications: mentionedUser.emailNotifications,
            }).catch(console.error)
          }
        }

        // ── In-app notifications ────────────────────────────
        // REPLY_TO_THREAD: notify post author
        if (postAuthorId && postAuthorId !== user.id) {
          await createForumNotification({
            type: 'REPLY_TO_THREAD',
            userId: postAuthorId,
            actorId: user.id,
            postId,
            commentId: comment.id,
          })
        }

        // REPLY_TO_POST: notify parent comment author (for nested replies)
        if (parentId) {
          const parentComment = await db.comment.findUnique({
            where: { id: parentId },
            select: { authorId: true },
          })
          if (parentComment && parentComment.authorId !== user.id) {
            await createForumNotification({
              type: 'REPLY_TO_POST',
              userId: parentComment.authorId,
              actorId: user.id,
              postId,
              commentId: comment.id,
            })
          }
        }

        // MENTION: notify @mentioned users (in-app, using extractMentions)
        const mentionedUsernamesForNotif = extractMentions(content)
        if (mentionedUsernamesForNotif.length > 0) {
          const mentionedUsersForNotif = await db.user.findMany({
            where: { username: { in: mentionedUsernamesForNotif }, NOT: { id: user.id } },
            select: { id: true },
          })
          for (const mentioned of mentionedUsersForNotif) {
            await createForumNotification({
              type: 'MENTION',
              userId: mentioned.id,
              actorId: user.id,
              postId,
              commentId: comment.id,
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
