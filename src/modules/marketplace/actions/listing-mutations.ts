'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import {
  ListingCategory,
  ItemCondition,
  FulfillmentType,
} from '@/generated/prisma/client'
import type {
  CreateListingInput,
  UpdateListingInput,
  ListingWithPhotos,
} from '@/modules/marketplace/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(36).substring(2, 8)
  return `${base}-${suffix}`
}

// ---------------------------------------------------------------------------
// Shared Prisma include
// ---------------------------------------------------------------------------

const listingInclude = {
  photos: {
    orderBy: { sortOrder: 'asc' as const },
  },
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
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const listingCategoryValues = Object.values(ListingCategory) as [string, ...string[]]
const itemConditionValues = Object.values(ItemCondition) as [string, ...string[]]
const fulfillmentTypeValues = Object.values(FulfillmentType) as [string, ...string[]]

const createListingSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  category: z.enum(listingCategoryValues),
  condition: z.enum(itemConditionValues),
  brand: z.string().max(100, 'Brand must be at most 100 characters').optional(),
  modelName: z.string().max(100, 'Model name must be at most 100 characters').optional(),
  year: z.number().int().min(1900).max(2030).optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
  price: z
    .number()
    .positive('Price must be positive')
    .max(999999, 'Price must be at most $999,999'),
  acceptsOffers: z.boolean().optional().default(true),
  minOfferPercent: z.number().int().min(1).max(99).optional(),
  fulfillment: z.enum(fulfillmentTypeValues),
  shippingCost: z.number().positive('Shipping cost must be positive').optional(),
  estimatedWeight: z.number().positive('Estimated weight must be positive').optional(),
  packageLength: z.number().positive('Package length must be positive').optional(),
  packageWidth: z.number().positive('Package width must be positive').optional(),
  packageHeight: z.number().positive('Package height must be positive').optional(),
  city: z.string().max(100, 'City must be at most 100 characters').optional(),
  state: z.string().max(2, 'State must be a 2-letter abbreviation').optional(),
  zipCode: z
    .string()
    .regex(/^\d{5}$/, 'ZIP code must be 5 digits')
    .optional(),
  fromGarageBikeId: z.string().optional(),
  // MTB-specific specs
  frameSize: z.string().max(20).optional(),
  wheelSize: z.string().max(20).optional(),
  forkTravel: z.number().int().min(50).max(250).optional(),
  rearTravel: z.number().int().min(50).max(250).optional(),
  frameMaterial: z.string().max(50).optional(),
  // Seller info
  sellerType: z.enum(['individual', 'shop']).optional().default('individual'),
  acceptsTrades: z.boolean().optional().default(false),
})

const updateListingSchema = createListingSchema.partial()

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Create a new listing.
 * Always sets status to `pending_review` — the monolith does not auto-approve
 * trusted sellers; all listings go through moderation.
 */
export async function createListing(data: CreateListingInput): Promise<ListingWithPhotos> {
  const user = await requireAuth()
  const userId = user.id

  const parsed = createListingSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const validated = parsed.data
  const slug = slugify(validated.title)

  // Auto-approve listings from trusted or verified sellers; others go to moderation
  const sellerProfile = await db.sellerProfile.findUnique({
    where: { userId },
    select: { isTrusted: true, isVerified: true },
  })
  const listingStatus =
    sellerProfile?.isTrusted || sellerProfile?.isVerified ? 'active' : 'pending_review'

  // Verify fromGarageBikeId belongs to this user (metadata only — clear silently if not)
  let verifiedFromGarageBikeId: string | undefined = validated.fromGarageBikeId
  if (verifiedFromGarageBikeId) {
    const owned = await db.userBike.findUnique({
      where: { id: verifiedFromGarageBikeId, userId },
      select: { id: true },
    })
    if (!owned) verifiedFromGarageBikeId = undefined
  }

  const listing = await db.listing.create({
    data: {
      slug,
      title: validated.title,
      description: validated.description,
      category: validated.category as ListingCategory,
      condition: validated.condition as ItemCondition,
      brand: validated.brand,
      modelName: validated.modelName,
      year: validated.year,
      tags: validated.tags ?? [],
      price: validated.price,
      acceptsOffers: validated.acceptsOffers,
      minOfferPercent: validated.minOfferPercent,
      fulfillment: validated.fulfillment as FulfillmentType,
      shippingCost: validated.shippingCost,
      estimatedWeight: validated.estimatedWeight,
      packageLength: validated.packageLength,
      packageWidth: validated.packageWidth,
      packageHeight: validated.packageHeight,
      city: validated.city,
      state: validated.state,
      zipCode: validated.zipCode,
      fromGarageBikeId: verifiedFromGarageBikeId,
      frameSize: validated.frameSize,
      wheelSize: validated.wheelSize,
      forkTravel: validated.forkTravel,
      rearTravel: validated.rearTravel,
      frameMaterial: validated.frameMaterial,
      sellerType: validated.sellerType ?? 'individual',
      acceptsTrades: validated.acceptsTrades ?? false,
      sellerId: userId,
      status: listingStatus,
    },
    include: listingInclude,
  })

  revalidatePath('/buy-sell')

  return listing as ListingWithPhotos
}

/**
 * Update an existing listing. Only the owner can update.
 */
export async function updateListing(
  id: string,
  data: UpdateListingInput,
): Promise<ListingWithPhotos> {
  const user = await requireAuth()
  const userId = user.id

  const existing = await db.listing.findUnique({
    where: { id },
    select: { sellerId: true, slug: true },
  })

  if (!existing) {
    throw new Error('Listing not found')
  }

  if (existing.sellerId !== userId) {
    throw new Error('You do not have permission to update this listing')
  }

  const parsed = updateListingSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const validated = parsed.data

  const updateData: Record<string, unknown> = {}
  if (validated.title !== undefined) updateData.title = validated.title
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.category !== undefined) updateData.category = validated.category
  if (validated.condition !== undefined) updateData.condition = validated.condition
  if (validated.brand !== undefined) updateData.brand = validated.brand
  if (validated.modelName !== undefined) updateData.modelName = validated.modelName
  if (validated.year !== undefined) updateData.year = validated.year
  if (validated.tags !== undefined) updateData.tags = validated.tags
  if (validated.price !== undefined) updateData.price = validated.price
  if (validated.acceptsOffers !== undefined) updateData.acceptsOffers = validated.acceptsOffers
  if (validated.minOfferPercent !== undefined)
    updateData.minOfferPercent = validated.minOfferPercent
  if (validated.fulfillment !== undefined) updateData.fulfillment = validated.fulfillment
  if (validated.shippingCost !== undefined) updateData.shippingCost = validated.shippingCost
  if (validated.estimatedWeight !== undefined)
    updateData.estimatedWeight = validated.estimatedWeight
  if (validated.packageLength !== undefined) updateData.packageLength = validated.packageLength
  if (validated.packageWidth !== undefined) updateData.packageWidth = validated.packageWidth
  if (validated.packageHeight !== undefined) updateData.packageHeight = validated.packageHeight
  if (validated.city !== undefined) updateData.city = validated.city
  if (validated.state !== undefined) updateData.state = validated.state
  if (validated.zipCode !== undefined) updateData.zipCode = validated.zipCode
  if (validated.frameSize !== undefined) updateData.frameSize = validated.frameSize
  if (validated.wheelSize !== undefined) updateData.wheelSize = validated.wheelSize
  if (validated.forkTravel !== undefined) updateData.forkTravel = validated.forkTravel
  if (validated.rearTravel !== undefined) updateData.rearTravel = validated.rearTravel
  if (validated.frameMaterial !== undefined) updateData.frameMaterial = validated.frameMaterial
  if (validated.sellerType !== undefined) updateData.sellerType = validated.sellerType
  if (validated.acceptsTrades !== undefined) updateData.acceptsTrades = validated.acceptsTrades

  // Regenerate slug if title changed
  if (validated.title !== undefined) {
    updateData.slug = slugify(validated.title)
  }

  const updated = await db.listing.update({
    where: { id },
    data: updateData,
    include: listingInclude,
  })

  revalidatePath(`/buy-sell/${existing.slug}`)
  if ((updated as { slug: string }).slug !== existing.slug) {
    revalidatePath(`/buy-sell/${(updated as { slug: string }).slug}`)
  }
  revalidatePath('/buy-sell')

  return updated as ListingWithPhotos
}

/**
 * Soft-delete a listing by setting status to `removed`.
 */
export async function deleteListing(id: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  const existing = await db.listing.findUnique({
    where: { id },
    select: { sellerId: true, slug: true },
  })

  if (!existing) {
    throw new Error('Listing not found')
  }

  if (existing.sellerId !== userId) {
    throw new Error('You do not have permission to delete this listing')
  }

  await db.listing.update({
    where: { id },
    data: { status: 'removed' },
  })

  revalidatePath(`/buy-sell/${existing.slug}`)
  revalidatePath('/buy-sell')
}

/**
 * Bump a listing to the top of search results.
 * Sets `isBumped: true` and records `bumpedAt` timestamp.
 */
export async function bumpListing(id: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  const existing = await db.listing.findUnique({
    where: { id },
    select: { sellerId: true, slug: true },
  })

  if (!existing) {
    throw new Error('Listing not found')
  }

  if (existing.sellerId !== userId) {
    throw new Error('You do not have permission to bump this listing')
  }

  await db.listing.update({
    where: { id },
    data: {
      isBumped: true,
      bumpedAt: new Date(),
    },
  })

  revalidatePath(`/buy-sell/${existing.slug}`)
  revalidatePath('/buy-sell')
}

/**
 * Mark a listing as sold.
 */
export async function markAsSold(id: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  const existing = await db.listing.findUnique({
    where: { id },
    select: { sellerId: true, slug: true },
  })

  if (!existing) {
    throw new Error('Listing not found')
  }

  if (existing.sellerId !== userId) {
    throw new Error('You do not have permission to mark this listing as sold')
  }

  await db.listing.update({
    where: { id },
    data: { status: 'sold' },
  })

  revalidatePath(`/buy-sell/${existing.slug}`)
  revalidatePath('/buy-sell')
  revalidatePath('/buy-sell/my')
}

/**
 * Cancel a listing (owner-initiated cancellation).
 */
export async function cancelListing(id: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  const existing = await db.listing.findUnique({
    where: { id },
    select: { sellerId: true, slug: true },
  })

  if (!existing) {
    throw new Error('Listing not found')
  }

  if (existing.sellerId !== userId) {
    throw new Error('You do not have permission to cancel this listing')
  }

  await db.listing.update({
    where: { id },
    data: { status: 'cancelled' },
  })

  revalidatePath(`/buy-sell/${existing.slug}`)
  revalidatePath('/buy-sell')
  revalidatePath('/buy-sell/my')
}

/**
 * Feature a listing (promoted placement).
 * Owner or admin can feature a listing.
 */
export async function featureListing(id: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id
  const isAdmin = user.role === 'admin'

  const existing = await db.listing.findUnique({
    where: { id },
    select: { sellerId: true, slug: true },
  })

  if (!existing) {
    throw new Error('Listing not found')
  }

  if (!isAdmin && existing.sellerId !== userId) {
    throw new Error('You do not have permission to feature this listing')
  }

  await db.listing.update({
    where: { id },
    data: { isFeatured: true },
  })

  revalidatePath(`/buy-sell/${existing.slug}`)
  revalidatePath('/buy-sell')
}
