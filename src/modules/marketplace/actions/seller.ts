'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import type {
  SellerProfileWithReviews,
  SellerReviewWithBuyer,
  TrustLevel,
} from '@/modules/marketplace/types'
import { createStripeAccount } from './stripe-connect'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a TrustLevel from SellerProfile fields.
 * - new:         fewer than 3 sales or no rating
 * - established: 3–19 sales and rating >= 4.0
 * - trusted:     20–49 sales, rating >= 4.5, isVerified or isTrusted
 * - power:       50+ sales, rating >= 4.7, isTrusted
 */
function computeTrustLevel(profile: {
  totalSales: number
  averageRating: number | null
  isVerified: boolean
  isTrusted: boolean
}): TrustLevel {
  const { totalSales, averageRating, isVerified, isTrusted } = profile

  if (isTrusted && totalSales >= 50 && (averageRating ?? 0) >= 4.7) {
    return 'power'
  }
  if ((isVerified || isTrusted) && totalSales >= 20 && (averageRating ?? 0) >= 4.5) {
    return 'trusted'
  }
  if (totalSales >= 3 && (averageRating ?? 0) >= 4.0) {
    return 'established'
  }
  return 'new'
}

async function buildSellerProfileWithReviews(
  profileId: string,
): Promise<SellerProfileWithReviews> {
  const profile = await db.sellerProfile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      user: { select: { id: true, name: true, image: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          reviewer: { select: { id: true, name: true, image: true } },
        },
      },
    },
  })

  const reviews: SellerReviewWithBuyer[] = profile.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    tags: r.tags,
    createdAt: r.createdAt,
    buyer: r.reviewer ?? { id: 'unknown', name: 'Anonymous', image: null },
  }))

  // Fetch active listings for the seller
  const listings = await db.listing.findMany({
    where: { sellerId: profile.userId, status: 'active' },
    include: {
      photos: true,
      seller: {
        select: {
          id: true,
          name: true,
          image: true,
          sellerProfile: {
            select: {
              averageRating: true,
              ratingCount: true,
              totalSales: true,
              isVerified: true,
              isTrusted: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 12,
  })

  return {
    id: profile.id,
    userId: profile.userId,
    user: profile.user,
    isVerified: profile.isVerified,
    totalSales: profile.totalSales,
    totalRevenue: Number(profile.totalRevenue),
    averageRating: profile.averageRating ? Number(profile.averageRating) : null,
    ratingCount: profile.ratingCount,
    avgResponseTime: profile.avgResponseTime,
    isTrusted: profile.isTrusted,
    stripeOnboarded: profile.stripeOnboarded,
    trustLevel: computeTrustLevel({
      totalSales: profile.totalSales,
      averageRating: profile.averageRating ? Number(profile.averageRating) : null,
      isVerified: profile.isVerified,
      isTrusted: profile.isTrusted,
    }),
    createdAt: profile.createdAt,
    reviews,
    listings,
  }
}

// ---------------------------------------------------------------------------
// 1. Create seller profile
// ---------------------------------------------------------------------------

export async function createSellerProfile(): Promise<SellerProfileWithReviews> {
  const user = await requireAuth()
  const userId = user.id!

  // Check if profile already exists
  const existing = await db.sellerProfile.findUnique({
    where: { userId },
  })
  if (existing) {
    return buildSellerProfileWithReviews(existing.id)
  }

  // Create the profile
  const profile = await db.sellerProfile.create({
    data: { userId },
  })

  // Kick off Stripe Express account creation (non-blocking — we store the ID async)
  // We don't await here to avoid blocking the user; stripe-connect action handles retries.
  createStripeAccount(userId).catch((err) =>
    console.error('[seller/createSellerProfile] stripe account creation failed', err),
  )

  revalidatePath('/marketplace/my/seller')

  return buildSellerProfileWithReviews(profile.id)
}

// ---------------------------------------------------------------------------
// 2. Update seller profile
// ---------------------------------------------------------------------------

export async function updateSellerProfile(_input: Record<string, never>): Promise<void> {
  // The SellerProfile schema has no editable text fields (bio/location are not present).
  // This action is a no-op placeholder for future schema additions.
  await requireAuth()
  revalidatePath('/marketplace/my/seller')
}

// ---------------------------------------------------------------------------
// 3. Get seller profile by userId (public)
// ---------------------------------------------------------------------------

export async function getSellerProfile(userId: string): Promise<SellerProfileWithReviews | null> {
  const profile = await db.sellerProfile.findUnique({
    where: { userId },
  })
  if (!profile) return null
  return buildSellerProfileWithReviews(profile.id)
}

// ---------------------------------------------------------------------------
// 4. Get my seller profile (authenticated)
// ---------------------------------------------------------------------------

export async function getMySellerProfile(): Promise<SellerProfileWithReviews | null> {
  const user = await requireAuth()
  const userId = user.id!
  return getSellerProfile(userId)
}

// ---------------------------------------------------------------------------
// 5. Submit seller review
// ---------------------------------------------------------------------------

export async function submitSellerReview(
  listingId: string,
  sellerId: string,
  rating: number,
  comment?: string,
  tags?: string[],
): Promise<void> {
  const user = await requireAuth()
  const reviewerId = user.id!

  // Validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be an integer between 1 and 5.')
  }

  // Verify the reviewer is NOT the seller
  const sellerProfile = await db.sellerProfile.findUniqueOrThrow({
    where: { id: sellerId },
    select: { userId: true },
  })
  if (sellerProfile.userId === reviewerId) {
    throw new Error('You cannot review yourself.')
  }

  // Verify the reviewer was actually the buyer on a completed transaction for this listing
  const transaction = await db.transaction.findFirst({
    where: {
      listingId,
      buyerId: reviewerId,
      status: 'completed',
    },
  })
  if (!transaction) {
    throw new Error('You can only review a seller after completing a purchase.')
  }

  // Upsert (unique: sellerId + reviewerId + listingId)
  await db.sellerReview.upsert({
    where: {
      sellerId_reviewerId_listingId: {
        sellerId,
        reviewerId,
        listingId,
      },
    },
    create: {
      sellerId,
      reviewerId,
      listingId,
      rating,
      body: comment ?? null,
      tags: tags ?? [],
    },
    update: {
      rating,
      body: comment ?? null,
      tags: tags ?? [],
    },
  })

  // Recompute average rating on the SellerProfile
  const aggregate = await db.sellerReview.aggregate({
    where: { sellerId },
    _avg: { rating: true },
    _count: { rating: true },
  })

  await db.sellerProfile.update({
    where: { id: sellerId },
    data: {
      averageRating: aggregate._avg.rating ?? null,
      ratingCount: aggregate._count.rating,
    },
  })

  revalidatePath(`/marketplace/seller/${sellerProfile.userId}`)
  revalidatePath('/marketplace/my/purchases')
}
