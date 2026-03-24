/**
 * Shared Prisma query helpers for the marketplace module.
 *
 * These are plain async functions (not server actions) — they share a common
 * `include` shape so every caller receives a consistent `ListingWithPhotos`
 * object without repeating the relation tree.
 *
 * Systematic adaptations from standalone:
 *   - `prisma` → `db`  (monolith db client)
 */

import { db } from '@/lib/db/client'
import type { Prisma } from '@/generated/prisma/client'
import type {
  BrowseOptions,
  ListingWithPhotos,
  PaginatedListings,
} from '../types'

// ---------------------------------------------------------------------------
// Shared Prisma `include` for all listing queries
// ---------------------------------------------------------------------------

export const listingInclude = {
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
} satisfies Prisma.ListingInclude

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20

export function buildWhereClause(options: BrowseOptions): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: 'active',
  }

  if (options.category) {
    where.category = options.category
  }

  if (options.condition && options.condition.length > 0) {
    where.condition = { in: options.condition }
  }

  if (options.fulfillment) {
    where.fulfillment = options.fulfillment
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    where.price = {}
    if (options.minPrice !== undefined) {
      where.price.gte = options.minPrice
    }
    if (options.maxPrice !== undefined) {
      where.price.lte = options.maxPrice
    }
  }

  if (options.brand) {
    where.brand = { equals: options.brand, mode: 'insensitive' }
  }

  if (options.city) {
    where.city = { equals: options.city, mode: 'insensitive' }
  }

  if (options.state) {
    where.state = { equals: options.state, mode: 'insensitive' }
  }

  return where
}

export function buildOrderBy(
  sort: BrowseOptions['sort'] = 'newest',
): Prisma.ListingOrderByWithRelationInput | Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return { price: 'asc' }
    case 'price_desc':
      return { price: 'desc' }
    case 'most_saved':
      return { saveCount: 'desc' }
    case 'newest':
    default:
      return { createdAt: 'desc' }
  }
}

// ---------------------------------------------------------------------------
// Exported query helpers
// ---------------------------------------------------------------------------

/**
 * Get a single listing by slug with photos and seller info.
 * Increments viewCount (fire-and-forget). Returns null for removed listings.
 */
export async function getListingBySlug(slug: string): Promise<ListingWithPhotos | null> {
  const listing = await db.listing.findUnique({
    where: { slug },
    include: listingInclude,
  })

  if (!listing || listing.status === 'removed') {
    return null
  }

  // Fire-and-forget view count increment
  db.listing
    .update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {
      // Silently ignore view count errors
    })

  return listing as ListingWithPhotos
}

/**
 * Get a single listing by ID with photos and seller info.
 * Does not increment view count — use for internal lookups (actions, admin).
 */
export async function getListingById(id: string): Promise<ListingWithPhotos | null> {
  const listing = await db.listing.findUnique({
    where: { id },
    include: listingInclude,
  })

  if (!listing || listing.status === 'removed') {
    return null
  }

  return listing as ListingWithPhotos
}

/**
 * Paginated browse with filters and sort. Uses cursor-based pagination.
 */
export async function getListings(options: BrowseOptions = {}): Promise<PaginatedListings> {
  const limit = options.limit ?? DEFAULT_LIMIT
  const where = buildWhereClause(options)
  const orderBy = buildOrderBy(options.sort)

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: listingInclude,
      orderBy,
      take: limit + 1, // fetch one extra to determine if there is a next page
      ...(options.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
    }),
    db.listing.count({ where }),
  ])

  let nextCursor: string | null = null
  if (listings.length > limit) {
    const nextItem = listings.pop()!
    nextCursor = nextItem.id
  }

  return {
    listings: listings as ListingWithPhotos[],
    nextCursor,
    total,
  }
}

/**
 * Full-text search across title, description, brand, modelName, and tags.
 * Returns paginated results with the same filter/sort options as getListings.
 */
export async function searchListings(
  query: string,
  options: BrowseOptions = {},
): Promise<PaginatedListings> {
  const limit = options.limit ?? DEFAULT_LIMIT
  const baseWhere = buildWhereClause(options)
  const orderBy = buildOrderBy(options.sort)

  const searchTerms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)

  if (searchTerms.length === 0) {
    return { listings: [], nextCursor: null, total: 0 }
  }

  // Each search term must match at least one of the searchable fields
  const searchConditions: Prisma.ListingWhereInput[] = searchTerms.map((term) => ({
    OR: [
      { title: { contains: term, mode: 'insensitive' as const } },
      { description: { contains: term, mode: 'insensitive' as const } },
      { brand: { contains: term, mode: 'insensitive' as const } },
      { modelName: { contains: term, mode: 'insensitive' as const } },
      { tags: { has: term.toLowerCase() } },
    ],
  }))

  const where: Prisma.ListingWhereInput = {
    ...baseWhere,
    AND: searchConditions,
  }

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: listingInclude,
      orderBy,
      take: limit + 1,
      ...(options.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
    }),
    db.listing.count({ where }),
  ])

  let nextCursor: string | null = null
  if (listings.length > limit) {
    const nextItem = listings.pop()!
    nextCursor = nextItem.id
  }

  return {
    listings: listings as ListingWithPhotos[],
    nextCursor,
    total,
  }
}

/**
 * Get up to 8 featured active listings.
 */
export async function getFeaturedListings(): Promise<ListingWithPhotos[]> {
  const listings = await db.listing.findMany({
    where: {
      status: 'active',
      isFeatured: true,
    },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  return listings as ListingWithPhotos[]
}

/**
 * Get recent active listings.
 */
export async function getRecentListings(limit = 12): Promise<ListingWithPhotos[]> {
  const listings = await db.listing.findMany({
    where: { status: 'active' },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return listings as ListingWithPhotos[]
}

/**
 * Get count of active listings per category.
 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const counts = await db.listing.groupBy({
    by: ['category'],
    where: { status: 'active' },
    _count: { _all: true },
  })

  const result: Record<string, number> = {}
  for (const row of counts) {
    result[row.category] = row._count._all
  }

  return result
}

/**
 * Get trending listings — most saved in the last 7 days.
 */
export async function getTrendingListings(limit = 8): Promise<ListingWithPhotos[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const listings = await db.listing.findMany({
    where: {
      status: 'active',
      saveCount: { gt: 0 },
      createdAt: { gte: sevenDaysAgo },
    },
    include: listingInclude,
    orderBy: { saveCount: 'desc' },
    take: limit,
  })

  return listings as ListingWithPhotos[]
}
