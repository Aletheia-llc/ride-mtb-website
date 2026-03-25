'use server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function markReviewHelpful(reviewId: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()

  const existing = await db.reviewHelpful.findUnique({
    where: { reviewId_userId: { reviewId, userId: user.id } },
  })
  if (existing) return { success: false, error: 'Already marked as helpful' }

  try {
    await db.$transaction(async (tx) => {
      await tx.reviewHelpful.create({ data: { reviewId, userId: user.id } })
      await tx.shopReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
      })
    })
  } catch {
    return { success: false, error: 'Something went wrong' }
  }

  revalidatePath('/shops')
  return { success: true }
}
