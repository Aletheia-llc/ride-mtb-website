import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import { uniqueSlug } from '@/lib/slugify'
import type {
  ListingSummary,
  ListingDetailData,
  ListingCategory,
  ItemCondition,
  ListingStatus,
} from '../types'

// ── Types ─────────────────────────────────────────────────────

interface ListingFilters {
  category?: ListingCategory
  condition?: ItemCondition
  search?: string
  minPrice?: number
  maxPrice?: number
  status?: ListingStatus
}

interface CreateListingInput {
  sellerId: string
  title: string
  description: string
  price: number
  category: ListingCategory
  condition: ItemCondition
  location?: string
  imageUrls: string[]
}

// ── 1. getListings ────────────────────────────────────────────

export async function getListings(
  filters: ListingFilters = {},
  page: number = 1,
): Promise<{ listings: ListingSummary[]; totalCount: number }> {
  const where: Record<string, unknown> = {
    status: filters.status ?? 'active',
  }

  if (filters.category) {
    where.category = filters.category
  }

  if (filters.condition) {
    where.condition = filters.condition
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceFilter: Record<string, number> = {}
    if (filters.minPrice !== undefined) priceFilter.gte = filters.minPrice
    if (filters.maxPrice !== undefined) priceFilter.lte = filters.maxPrice
    where.price = priceFilter
  }

  const [listings, totalCount] = await Promise.all([
    db.listing.findMany({
      where,
      ...paginate(page),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        category: true,
        condition: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        seller: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.listing.count({ where }),
  ])

  const summaries: ListingSummary[] = listings.map((listing) => {
    const urls = listing.imageUrls as string[]
    return {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      price: listing.price,
      category: listing.category as ListingCategory,
      condition: listing.condition as ItemCondition,
      location: listing.location,
      firstImageUrl: urls.length > 0 ? urls[0] : null,
      status: listing.status as ListingStatus,
      sellerName: listing.seller.name,
      createdAt: listing.createdAt,
    }
  })

  return { listings: summaries, totalCount }
}

// ── 2. getListingBySlug ───────────────────────────────────────

export async function getListingBySlug(slug: string): Promise<ListingDetailData | null> {
  const listing = await db.listing.findUnique({
    where: { slug },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: { favorites: true },
      },
    },
  })

  if (!listing) return null

  return {
    id: listing.id,
    sellerId: listing.sellerId,
    title: listing.title,
    slug: listing.slug,
    description: listing.description,
    price: listing.price,
    category: listing.category as ListingCategory,
    condition: listing.condition as ItemCondition,
    location: listing.location,
    imageUrls: listing.imageUrls as string[],
    status: listing.status as ListingStatus,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    seller: listing.seller,
    favoriteCount: listing._count.favorites,
  }
}

// ── 3. createListing ──────────────────────────────────────────

export async function createListing(input: CreateListingInput) {
  const slug = await uniqueSlug(input.title, async (candidate) => {
    const existing = await db.listing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    return !!existing
  })

  return db.listing.create({
    data: {
      sellerId: input.sellerId,
      title: input.title,
      slug,
      description: input.description,
      price: input.price,
      category: input.category,
      condition: input.condition,
      location: input.location || null,
      imageUrls: input.imageUrls,
    },
  })
}

// ── 4. updateListingStatus ────────────────────────────────────

export async function updateListingStatus(
  listingId: string,
  sellerId: string,
  status: ListingStatus,
) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (listing.sellerId !== sellerId) {
    throw new Error('Not authorized to update this listing')
  }

  return db.listing.update({
    where: { id: listingId },
    data: { status },
  })
}

// ── 5. deleteListing ──────────────────────────────────────────

export async function deleteListing(listingId: string, sellerId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (listing.sellerId !== sellerId) {
    throw new Error('Not authorized to delete this listing')
  }

  return db.listing.delete({
    where: { id: listingId },
  })
}

// ── 6. toggleListingFavorite ──────────────────────────────────

export async function toggleListingFavorite(listingId: string, userId: string) {
  const existing = await db.listingFavorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
  })

  if (existing) {
    await db.listingFavorite.delete({ where: { id: existing.id } })
    return { favorited: false, sellerId: null as string | null }
  }

  const favorite = await db.listingFavorite.create({
    data: { userId, listingId },
    include: { listing: { select: { sellerId: true } } },
  })
  return { favorited: true, sellerId: favorite.listing.sellerId }
}

// ── 7. getUserFavoriteListings ────────────────────────────────

export async function getUserFavoriteListings(userId: string) {
  const favorites = await db.listingFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          category: true,
          condition: true,
          location: true,
          imageUrls: true,
          status: true,
          createdAt: true,
          seller: { select: { name: true } },
          _count: { select: { favorites: true } },
        },
      },
    },
  })
  return favorites
    .map((f) => f.listing)
    .filter((l) => l.status === 'active')
}

// ── 8. getListingFavoriteCounts ───────────────────────────────

export async function getListingFavoriteCounts(listingIds: string[]): Promise<Record<string, number>> {
  if (listingIds.length === 0) return {}
  const counts = await db.listingFavorite.groupBy({
    by: ['listingId'],
    where: { listingId: { in: listingIds } },
    _count: { _all: true },
  })
  return Object.fromEntries(counts.map((c) => [c.listingId, c._count._all]))
}

// ── 9. getUserFavoriteIds ─────────────────────────────────────

export async function getUserFavoriteIds(userId: string): Promise<string[]> {
  const favs = await db.listingFavorite.findMany({
    where: { userId },
    select: { listingId: true },
  })
  return favs.map((f) => f.listingId)
}

// ── 10. isListingFavorited ────────────────────────────────────

export async function isListingFavorited(listingId: string, userId: string): Promise<boolean> {
  const fav = await db.listingFavorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
    select: { id: true },
  })
  return fav !== null
}
