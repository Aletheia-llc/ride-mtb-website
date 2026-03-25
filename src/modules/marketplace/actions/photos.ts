'use server'

import { put, del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import type { ListingPhoto } from '@/generated/prisma/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_PHOTOS_PER_LISTING = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify the authenticated user owns the listing.
 * Returns the listing's slug for cache revalidation.
 */
async function assertListingOwner(
  listingId: string,
  userId: string,
): Promise<string> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, slug: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (listing.sellerId !== userId) {
    throw new Error('You do not have permission to manage photos for this listing')
  }

  return listing.slug
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Upload a photo to Vercel Blob and create a ListingPhoto record.
 * The first photo uploaded automatically becomes the cover photo.
 */
export async function uploadListingPhoto(
  listingId: string,
  file: File,
): Promise<ListingPhoto> {
  const user = await requireAuth()

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Accepted: JPEG, PNG, WebP')
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum 10MB')
  }

  const slug = await assertListingOwner(listingId, user.id)

  // Check existing photo count
  const existingCount = await db.listingPhoto.count({
    where: { listingId },
  })

  if (existingCount >= MAX_PHOTOS_PER_LISTING) {
    throw new Error(`Maximum ${MAX_PHOTOS_PER_LISTING} photos allowed per listing`)
  }

  // Derive a clean filename from the original, preserving extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const timestamp = Date.now()
  const filename = `${timestamp}.${ext}`

  // Upload to Vercel Blob
  const blob = await put(`marketplace/${listingId}/${filename}`, file, {
    access: 'public',
    contentType: file.type,
  })

  // First photo becomes the cover
  const isCover = existingCount === 0

  const photo = await db.listingPhoto.create({
    data: {
      listingId,
      url: blob.url,
      sortOrder: existingCount,
      isCover,
    },
  })

  revalidatePath(`/buy-sell/${slug}`)

  return photo
}

/**
 * Delete a photo from Vercel Blob and remove the ListingPhoto record.
 * If the deleted photo was the cover, promotes the next photo (lowest sortOrder).
 */
export async function deleteListingPhoto(photoId: string): Promise<void> {
  const user = await requireAuth()

  const photo = await db.listingPhoto.findUnique({
    where: { id: photoId },
    include: {
      listing: { select: { sellerId: true, slug: true } },
    },
  })

  if (!photo) {
    throw new Error('Photo not found')
  }

  if (photo.listing.sellerId !== user.id) {
    throw new Error('You do not have permission to delete this photo')
  }

  // Delete from Vercel Blob first
  await del(photo.url)

  // Remove DB record
  await db.listingPhoto.delete({ where: { id: photoId } })

  // If the deleted photo was the cover, promote the next one
  if (photo.isCover) {
    const next = await db.listingPhoto.findFirst({
      where: { listingId: photo.listingId },
      orderBy: { sortOrder: 'asc' },
    })

    if (next) {
      await db.listingPhoto.update({
        where: { id: next.id },
        data: { isCover: true },
      })
    }
  }

  revalidatePath(`/buy-sell/${photo.listing.slug}`)
}

/**
 * Reorder photos for a listing by providing an ordered array of photo IDs.
 * The sortOrder is set to the index position in the provided array.
 */
export async function reorderListingPhotos(
  listingId: string,
  photoIds: string[],
): Promise<void> {
  const user = await requireAuth()

  const slug = await assertListingOwner(listingId, user.id)

  // Verify all photoIds belong to this listing
  const photos = await db.listingPhoto.findMany({
    where: { listingId },
    select: { id: true },
  })

  const ownedIds = new Set(photos.map((p) => p.id))
  for (const id of photoIds) {
    if (!ownedIds.has(id)) {
      throw new Error(`Photo ${id} does not belong to this listing`)
    }
  }

  // Update sortOrder for each photo in a transaction
  await db.$transaction(
    photoIds.map((id, index) =>
      db.listingPhoto.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  )

  revalidatePath(`/buy-sell/${slug}`)
}

/**
 * Set a specific photo as the cover photo, unsetting all others.
 */
export async function setPhotoCover(photoId: string): Promise<void> {
  const user = await requireAuth()

  const photo = await db.listingPhoto.findUnique({
    where: { id: photoId },
    include: {
      listing: { select: { sellerId: true, slug: true } },
    },
  })

  if (!photo) {
    throw new Error('Photo not found')
  }

  if (photo.listing.sellerId !== user.id) {
    throw new Error('You do not have permission to update this photo')
  }

  // Unset all cover flags for the listing, then set this one
  await db.$transaction([
    db.listingPhoto.updateMany({
      where: { listingId: photo.listingId },
      data: { isCover: false },
    }),
    db.listingPhoto.update({
      where: { id: photoId },
      data: { isCover: true },
    }),
  ])

  revalidatePath(`/buy-sell/${photo.listing.slug}`)
}

/**
 * Return all photos for a listing ordered by sortOrder ascending.
 */
export async function getListingPhotos(listingId: string): Promise<ListingPhoto[]> {
  return db.listingPhoto.findMany({
    where: { listingId },
    orderBy: { sortOrder: 'asc' },
  })
}
