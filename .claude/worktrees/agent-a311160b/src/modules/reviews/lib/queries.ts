import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import { uniqueSlug } from '@/lib/slugify'
import type { GearCategory } from '../types'

// ── Types ─────────────────────────────────────────────────────

interface GetGearReviewsFilters {
  category?: GearCategory
  brand?: string
  minRating?: number
}

interface CreateGearReviewInput {
  userId: string
  title: string
  category: GearCategory
  brand: string
  productName: string
  rating: number
  pros?: string
  cons?: string
  content: string
  imageUrl?: string
}

const userSelect = {
  id: true,
  name: true,
  image: true,
} as const

// ── 1. getGearReviews ─────────────────────────────────────────

export async function getGearReviews(
  filters?: GetGearReviewsFilters,
  page: number = 1,
) {
  const where: Record<string, unknown> = {}

  if (filters?.category) {
    where.category = filters.category
  }
  if (filters?.brand) {
    where.brand = { contains: filters.brand, mode: 'insensitive' }
  }
  if (filters?.minRating) {
    where.rating = { gte: filters.minRating }
  }

  const [reviews, totalCount] = await Promise.all([
    db.gearReview.findMany({
      where,
      ...paginate(page),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        brand: true,
        productName: true,
        rating: true,
        createdAt: true,
        user: { select: userSelect },
      },
    }),
    db.gearReview.count({ where }),
  ])

  return { reviews, totalCount }
}

// ── 2. getGearReviewBySlug ────────────────────────────────────

export async function getGearReviewBySlug(slug: string) {
  return db.gearReview.findUnique({
    where: { slug },
    include: {
      user: { select: userSelect },
    },
  })
}

// ── 3. createGearReview ───────────────────────────────────────

export async function createGearReview(input: CreateGearReviewInput) {
  const slug = await uniqueSlug(input.title, async (candidate) => {
    const existing = await db.gearReview.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    return !!existing
  })

  return db.gearReview.create({
    data: {
      userId: input.userId,
      title: input.title,
      slug,
      category: input.category,
      brand: input.brand,
      productName: input.productName,
      rating: input.rating,
      pros: input.pros || null,
      cons: input.cons || null,
      content: input.content,
      imageUrl: input.imageUrl || null,
    },
  })
}

// ── 4. deleteGearReview ───────────────────────────────────────

export async function deleteGearReview(reviewId: string, userId: string) {
  const review = await db.gearReview.findUnique({
    where: { id: reviewId },
    select: { userId: true },
  })

  if (!review) {
    throw new Error('Review not found')
  }

  if (review.userId !== userId) {
    throw new Error('Not authorized to delete this review')
  }

  return db.gearReview.delete({
    where: { id: reviewId },
  })
}
