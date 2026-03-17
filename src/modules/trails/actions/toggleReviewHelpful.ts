'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export async function toggleReviewHelpful(reviewId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  const userId = session.user.id

  const existing = await db.trailReviewHelpful.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  })

  if (existing) {
    await db.trailReviewHelpful.delete({ where: { id: existing.id } })
    await db.trailReview.update({
      where: { id: reviewId },
      data: { helpfulCount: { decrement: 1 } },
    })
  } else {
    await db.trailReviewHelpful.create({ data: { reviewId, userId } })
    await db.trailReview.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    })
  }
}
