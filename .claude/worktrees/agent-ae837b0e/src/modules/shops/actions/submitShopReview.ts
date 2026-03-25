'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  shopId: z.string().min(1),
  overallRating: z.coerce.number().int().min(1).max(5),
  serviceRating: z.coerce.number().int().min(1).max(5),
  pricingRating: z.coerce.number().int().min(1).max(5),
  selectionRating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(2000),
  bikeType: z.string().max(50).optional(),
})

export type ReviewState = { errors: Record<string, string>; success?: boolean }

export async function submitShopReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }
    const { shopId, ...data } = parsed.data

    // Prevent duplicate reviews
    const existing = await db.shopReview.findFirst({ where: { shopId, userId: user.id } })
    if (existing) return { errors: { general: 'You have already reviewed this shop' } }

    await db.$transaction(async (tx) => {
      await tx.shopReview.create({ data: { ...data, shopId, userId: user.id } })

      const agg = await tx.shopReview.aggregate({
        where: { shopId },
        _avg: { overallRating: true, serviceRating: true, pricingRating: true, selectionRating: true },
        _count: { id: true },
      })
      await tx.shop.update({
        where: { id: shopId },
        data: {
          avgOverallRating: agg._avg.overallRating ?? undefined,
          avgServiceRating: agg._avg.serviceRating ?? undefined,
          avgPricingRating: agg._avg.pricingRating ?? undefined,
          avgSelectionRating: agg._avg.selectionRating ?? undefined,
          reviewCount: agg._count.id,
        },
      })
    })
    revalidatePath('/shops')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
