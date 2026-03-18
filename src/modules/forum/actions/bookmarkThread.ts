'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export async function toggleForumBookmark(postId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const userId = session.user.id
  const existing = await db.bookmark.findUnique({
    where: { userId_postId: { userId, postId } },
  })

  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } })
    return { bookmarked: false }
  } else {
    await db.bookmark.create({ data: { userId, postId } })
    return { bookmarked: true }
  }
}
