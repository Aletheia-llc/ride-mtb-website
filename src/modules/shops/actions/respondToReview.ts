'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  reviewId: z.string().min(1),
  ownerResponse: z.string().min(5).max(2000),
})

export type ResponseState = { errors: Record<string, string>; success?: boolean }

export async function respondToReview(slug: string, _prev: ResponseState, formData: FormData): Promise<ResponseState> {
  try {
    const { shop } = await requireShopOwner(slug)
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }

    const { reviewId, ownerResponse } = parsed.data

    // Verify the review belongs to this shop
    const review = await db.shopReview.findFirst({
      where: { id: reviewId, shopId: shop.id },
    })
    if (!review) return { errors: { general: 'Review not found' } }
    if (review.ownerResponse) return { errors: { general: 'Already responded to this review' } }

    await db.shopReview.update({
      where: { id: reviewId },
      data: { ownerResponse, ownerResponseAt: new Date() },
    })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
