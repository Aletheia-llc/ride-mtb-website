'use server'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function markReviewHelpful(reviewId: string): Promise<{ success: boolean }> {
  try {
    const user = await requireAuth()
    await db.reviewHelpful.create({ data: { reviewId, userId: user.id } })
    await db.shopReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } })
    return { success: true }
  } catch {
    return { success: false }
  }
}
