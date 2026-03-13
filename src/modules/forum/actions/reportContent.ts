'use server'

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { ForumReportTarget } from '@/generated/prisma/client'

export async function reportForumPost(postId: string, reason: string) {
  const user = await requireAuth()
  if (!reason.trim()) throw new Error('Reason is required')

  const existing = await db.forumReport.findFirst({
    where: { reporterId: user.id, postId, status: 'OPEN' },
  })
  if (existing) return { success: true, alreadyReported: true }

  await db.forumReport.create({
    data: {
      reporterId: user.id,
      targetType: ForumReportTarget.POST,
      postId,
      reason: reason.trim(),
    },
  })

  return { success: true }
}

export async function reportForumThread(threadId: string, reason: string) {
  const user = await requireAuth()
  if (!reason.trim()) throw new Error('Reason is required')

  const existing = await db.forumReport.findFirst({
    where: { reporterId: user.id, threadId, status: 'OPEN' },
  })
  if (existing) return { success: true, alreadyReported: true }

  await db.forumReport.create({
    data: {
      reporterId: user.id,
      targetType: ForumReportTarget.THREAD,
      threadId,
      reason: reason.trim(),
    },
  })

  return { success: true }
}
