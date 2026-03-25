'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createTrailReview } from '../lib/queries'

const reviewSchema = z.object({
  trailId: z.string().min(1, 'Trail ID is required'),
  rating: z.coerce.number().int().min(1, 'Rating is required').max(5),
  flowRating: z.coerce.number().int().min(1).max(5).optional(),
  sceneryRating: z.coerce.number().int().min(1).max(5).optional(),
  technicalRating: z.coerce.number().int().min(1).max(5).optional(),
  maintenanceRating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(5000).optional(),
  rideDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date
  }),
  bikeType: z.string().max(100).optional(),
})

export type SubmitReviewState = {
  errors: Record<string, string>
  success?: boolean
}

export async function submitReview(
  _prevState: SubmitReviewState,
  formData: FormData,
): Promise<SubmitReviewState> {
  try {
    const user = await requireAuth()

    const raw = {
      trailId: formData.get('trailId'),
      rating: formData.get('rating'),
      flowRating: formData.get('flowRating') || undefined,
      sceneryRating: formData.get('sceneryRating') || undefined,
      technicalRating: formData.get('technicalRating') || undefined,
      maintenanceRating: formData.get('maintenanceRating') || undefined,
      comment: formData.get('comment') || undefined,
      rideDate: formData.get('rideDate') || undefined,
      bikeType: formData.get('bikeType') || undefined,
    }

    const parsed = reviewSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { trailId, rating, flowRating, sceneryRating, technicalRating, maintenanceRating, comment, rideDate, bikeType } = parsed.data

    await rateLimit({ userId: user.id, action: 'trail-submit-review', maxPerMinute: 5 })

    const review = await createTrailReview({
      trailId,
      userId: user.id,
      rating,
      flowRating,
      sceneryRating,
      technicalRating,
      maintenanceRating,
      comment,
      rideDate,
      bikeType,
    })

    await grantXP({
      userId: user.id,
      event: 'trail_review_submitted',
      module: 'trails',
      refId: review.id,
    })

    revalidatePath(`/trails/explore/[systemSlug]/[trailSlug]`, 'page')

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
