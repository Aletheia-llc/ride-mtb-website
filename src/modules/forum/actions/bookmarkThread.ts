'use server'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

export async function toggleForumBookmark(threadId: string): Promise<{ bookmarked: boolean }> {
  const user = await requireAuth()
  const existing = await db.forumBookmark.findUnique({
    where: { userId_threadId: { userId: user.id, threadId } },
  })
  if (existing) {
    await db.forumBookmark.delete({ where: { id: existing.id } })
    return { bookmarked: false }
  }
  await db.forumBookmark.create({ data: { userId: user.id, threadId } })
  return { bookmarked: true }
}
