'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export async function reportContent(data: {
  targetType: 'post' | 'comment'
  targetId: string
  reason: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  await db.report.create({
    data: {
      reporterId: session.user.id,
      postId: data.targetType === 'post' ? data.targetId : null,
      commentId: data.targetType === 'comment' ? data.targetId : null,
      reason: data.reason,
      status: 'pending',
    },
  })

  return { success: true }
}
