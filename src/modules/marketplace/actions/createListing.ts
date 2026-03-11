'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { createListing as createListingQuery } from '../lib/queries'

const categoryEnum = z.enum([
  'complete_bikes',
  'frames',
  'wheels',
  'suspension',
  'drivetrain',
  'brakes',
  'cockpit',
  'protection',
  'clothing',
  'accessories',
  'other',
])

const conditionEnum = z.enum(['new', 'like_new', 'good', 'fair', 'poor'])

const createListingSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be at most 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be at most 5,000 characters'),
  price: z
    .number({ error: 'Price must be a number' })
    .positive('Price must be greater than zero'),
  category: categoryEnum,
  condition: conditionEnum,
  location: z.string().max(200).optional(),
  imageUrls: z.array(z.string().url('Each image URL must be valid')),
})

export type CreateListingState = {
  errors: Record<string, string>
  success?: boolean
}

export async function createListing(
  _prevState: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  let redirectUrl: string | null = null

  try {
    const user = await requireAuth()

    // Parse image URLs from newline-separated textarea
    const imageUrlsRaw = (formData.get('imageUrls') as string) || ''
    const imageUrls = imageUrlsRaw
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0)

    const priceRaw = formData.get('price')
    const price = priceRaw ? parseFloat(priceRaw as string) : undefined

    const raw = {
      title: formData.get('title'),
      description: formData.get('description'),
      price,
      category: formData.get('category'),
      condition: formData.get('condition'),
      location: (formData.get('location') as string) || undefined,
      imageUrls,
    }

    const parsed = createListingSchema.safeParse(raw)
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

    const { title, description, category, condition, location } = parsed.data

    await rateLimit({ userId: user.id, action: 'marketplace-create-listing', maxPerMinute: 5 })

    const listing = await createListingQuery({
      sellerId: user.id,
      title,
      description,
      price: parsed.data.price,
      category,
      condition,
      location,
      imageUrls: parsed.data.imageUrls,
    })

    redirectUrl = `/marketplace/${listing.slug}`
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }

  // redirect() throws internally — must be called outside try/catch
  redirect(redirectUrl)
}
