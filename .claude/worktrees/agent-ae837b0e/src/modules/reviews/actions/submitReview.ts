'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createGearReview } from '../lib/queries'

const submitReviewSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be at most 100 characters'),
  category: z.enum(
    [
      'bikes', 'helmets', 'protection', 'shoes', 'clothing',
      'wheels', 'suspension', 'drivetrain', 'brakes', 'cockpit',
      'accessories', 'tools', 'other',
    ],
    { error: 'Please select a category' },
  ),
  brand: z
    .string()
    .min(1, 'Brand is required')
    .max(100, 'Brand must be at most 100 characters'),
  productName: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be at most 200 characters'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Please select a rating')
    .max(5, 'Rating must be between 1 and 5'),
  pros: z
    .string()
    .max(2000, 'Pros must be at most 2000 characters')
    .optional()
    .transform((v) => v || undefined),
  cons: z
    .string()
    .max(2000, 'Cons must be at most 2000 characters')
    .optional()
    .transform((v) => v || undefined),
  content: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(5000, 'Review must be at most 5000 characters'),
  imageUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
})

export type SubmitReviewState = {
  errors: Record<string, string>
  success?: boolean
}

export async function submitReview(
  _prevState: SubmitReviewState,
  formData: FormData,
): Promise<SubmitReviewState> {
  let redirectUrl: string | null = null

  try {
    const user = await requireAuth()

    const raw = {
      title: formData.get('title'),
      category: formData.get('category'),
      brand: formData.get('brand'),
      productName: formData.get('productName'),
      rating: formData.get('rating'),
      pros: formData.get('pros'),
      cons: formData.get('cons'),
      content: formData.get('content'),
      imageUrl: formData.get('imageUrl'),
    }

    const parsed = submitReviewSchema.safeParse(raw)
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

    const { title, category, brand, productName, rating, pros, cons, content, imageUrl } = parsed.data

    await rateLimit({ userId: user.id, action: 'reviews-submit', maxPerMinute: 5 })

    const review = await createGearReview({
      userId: user.id,
      title,
      category,
      brand,
      productName,
      rating,
      pros,
      cons,
      content,
      imageUrl,
    })

    await grantXP({
      userId: user.id,
      event: 'review_submitted',
      module: 'reviews',
      refId: review.id,
    })

    revalidatePath('/reviews')
    redirectUrl = `/reviews/${review.slug}`
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }

  // redirect() throws internally — must be called outside try/catch
  redirect(redirectUrl)
}
