'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

export async function resolveForumReport(reportId: string, modNote?: string) {
  const mod = await requireAdmin()

  await db.forumReport.update({
    where: { id: reportId },
    data: {
      status: 'RESOLVED',
      moderatorId: mod.id,
      modNote: modNote || null,
      resolvedAt: new Date(),
    },
  })

  revalidatePath('/forum/admin/reports')
  return { success: true }
}

export async function dismissForumReport(reportId: string) {
  const mod = await requireAdmin()

  await db.forumReport.update({
    where: { id: reportId },
    data: {
      status: 'DISMISSED',
      moderatorId: mod.id,
      resolvedAt: new Date(),
    },
  })

  revalidatePath('/forum/admin/reports')
  return { success: true }
}

export async function deleteReportedPost(reportId: string, postId: string) {
  const mod = await requireAdmin()

  await db.$transaction([
    db.forumPost.delete({ where: { id: postId } }),
    db.forumReport.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        moderatorId: mod.id,
        modNote: 'Post deleted by moderator',
        resolvedAt: new Date(),
      },
    }),
  ])

  revalidatePath('/forum/admin/reports')
  return { success: true }
}

export async function deleteReportedThread(reportId: string, threadId: string) {
  const mod = await requireAdmin()

  await db.$transaction([
    db.forumThread.delete({ where: { id: threadId } }),
    db.forumReport.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        moderatorId: mod.id,
        modNote: 'Thread deleted by moderator',
        resolvedAt: new Date(),
      },
    }),
  ])

  revalidatePath('/forum/admin/reports')
  return { success: true }
}

export async function banReportedUser(reportId: string, targetUserId: string) {
  const mod = await requireAdmin()

  await db.$transaction([
    db.user.update({
      where: { id: targetUserId },
      data: { bannedAt: new Date() },
    }),
    db.forumReport.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        moderatorId: mod.id,
        modNote: 'User banned by moderator',
        resolvedAt: new Date(),
      },
    }),
  ])

  revalidatePath('/forum/admin/reports')
  return { success: true }
}

export async function unbanUser(targetUserId: string) {
  await requireAdmin()

  await db.user.update({
    where: { id: targetUserId },
    data: { bannedAt: null },
  })

  return { success: true }
}
