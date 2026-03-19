'use server'

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { auth } from '@/lib/auth/config'
import {
  getListingBySlug,
  getListings,
  searchListings,
  getFeaturedListings,
  listingInclude,
} from '@/modules/marketplace/lib/queries'
import type {
  BrowseOptions,
  ListingWithPhotos,
  PaginatedListings,
} from '@/modules/marketplace/types'

// ---------------------------------------------------------------------------
// Browse / search
// ---------------------------------------------------------------------------

/**
 * Paginated browse with filters and sort. Uses cursor-based pagination.
 * Delegates entirely to the shared query helper.
 */
export async function browseListings(
  filters: BrowseOptions = {},
): Promise<PaginatedListings> {
  return getListings(filters)
}

// ---------------------------------------------------------------------------
// Listing detail
// ---------------------------------------------------------------------------

/**
 * Fetch a single listing by slug and increment its view count (fire-and-forget).
 * Returns null if the listing is removed or does not exist.
 */
export async function getListingDetail(
  slug: string,
): Promise<ListingWithPhotos | null> {
  return getListingBySlug(slug)
}

// ---------------------------------------------------------------------------
// Authenticated user queries
// ---------------------------------------------------------------------------

/**
 * Get all listings created by the current authenticated user.
 * Pass an explicit userId to fetch another user's listings (e.g. admin lookups).
 */
export async function getMyListings(userId?: string): Promise<ListingWithPhotos[]> {
  let sellerId: string

  if (userId) {
    sellerId = userId
  } else {
    const user = await requireAuth()
    sellerId = user.id
  }

  const listings = await db.listing.findMany({
    where: { sellerId },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
  })

  return listings as ListingWithPhotos[]
}

/**
 * Get listings saved by the current authenticated user.
 * Returns an empty array if the user is not signed in.
 */
export async function getSavedListings(): Promise<ListingWithPhotos[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const saves = await db.listingSave.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        include: listingInclude,
      },
    },
  })

  return saves.map((save) => save.listing) as ListingWithPhotos[]
}

// ---------------------------------------------------------------------------
// Homepage / discovery
// ---------------------------------------------------------------------------

/**
 * Get up to 8 featured active listings for the homepage.
 * Delegates to the shared query helper.
 */
export { getFeaturedListings }

/**
 * Get listings related to a given listing by category.
 * Excludes the source listing. Returns up to 6 results.
 */
export async function getRelatedListings(
  listingId: string,
  category: string,
): Promise<ListingWithPhotos[]> {
  const listings = await db.listing.findMany({
    where: {
      status: 'active',
      category: category as ListingWithPhotos['category'],
      NOT: { id: listingId },
    },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  return listings as ListingWithPhotos[]
}
