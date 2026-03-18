'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'

export async function toggleReviewHelpful(reviewId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  const userId = session.user.id

  await db.$transaction(async (tx) => {
    const existing = await tx.trailReviewHelpful.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    })

    if (existing) {
      await tx.trailReviewHelpful.delete({ where: { id: existing.id } })
      await tx.trailReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { decrement: 1 } },
      })
    } else {
      await tx.trailReviewHelpful.create({ data: { reviewId, userId } })
      await tx.trailReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
      })
    }
  })
}
