import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import { ShopStatus, LeadEventType } from '@/generated/prisma/client'
import type { ShopSummary, ShopDetailData, ShopAffiliateLink } from '../types'

// ── getShopReviews ─────────────────────────────────────────

export async function getShopReviews(shopId: string) {
  return db.shopReview.findMany({
    where: { shopId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

// ── getShopWithDetails ─────────────────────────────────────

export async function getShopWithDetails(slug: string) {
  const shop = await db.shop.findUnique({
    where: { slug },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      reviews: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
  if (!shop) return null
  if (shop.status !== ShopStatus.ACTIVE && shop.status !== ShopStatus.CLAIMED) return null
  return shop
}

// ── getShops ──────────────────────────────────────────────

interface ShopFilters {
  state?: string
  city?: string
  search?: string
}

export async function getShops(
  filters?: ShopFilters,
  page: number = 1,
): Promise<{ shops: ShopSummary[]; totalCount: number }> {
  const where: Record<string, unknown> = {
    status: { in: [ShopStatus.ACTIVE, ShopStatus.CLAIMED] },
  }

  if (filters?.state) {
    where.state = filters.state
  }

  if (filters?.city) {
    where.city = { contains: filters.city, mode: 'insensitive' }
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { city: { contains: filters.search, mode: 'insensitive' } },
      { state: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [rawShops, totalCount] = await Promise.all([
    db.shop.findMany({
      where,
      ...paginate(page),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        phone: true,
        imageUrl: true,
        services: true,
        brands: true,
      },
    }),
    db.shop.count({ where }),
  ])

  const shops: ShopSummary[] = rawShops.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    city: s.city,
    state: s.state,
    phone: s.phone,
    imageUrl: s.imageUrl,
    servicesCount: Array.isArray(s.services) ? (s.services as string[]).length : 0,
    brandsCount: Array.isArray(s.brands) ? (s.brands as string[]).length : 0,
  }))

  return { shops, totalCount }
}

// ── getShopBySlug ─────────────────────────────────────────

export async function getShopBySlug(slug: string): Promise<ShopDetailData | null> {
  const shop = await db.shop.findUnique({
    where: { slug },
    include: {
      affiliateLinks: {
        where: { isActive: true },
        select: { slug: true, name: true, url: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!shop) return null
  if (shop.status !== ShopStatus.ACTIVE && shop.status !== ShopStatus.CLAIMED) return null

  const affiliateLinks: ShopAffiliateLink[] = shop.affiliateLinks.map((l) => ({
    slug: l.slug,
    name: l.name,
    url: `/api/affiliate/track/${l.slug}`,
  }))

  return {
    id: shop.id,
    ownerId: shop.ownerId,
    name: shop.name,
    slug: shop.slug,
    description: shop.description,
    address: shop.address,
    city: shop.city,
    state: shop.state,
    zipCode: shop.zipCode,
    country: shop.country,
    phone: shop.phone,
    email: shop.email,
    websiteUrl: shop.websiteUrl,
    latitude: shop.latitude,
    longitude: shop.longitude,
    imageUrl: shop.imageUrl,
    services: Array.isArray(shop.services) ? (shop.services as string[]) : [],
    brands: Array.isArray(shop.brands) ? (shop.brands as string[]) : [],
    hoursJson: shop.hoursJson ?? undefined,
    avgOverallRating: shop.avgOverallRating,
    avgServiceRating: shop.avgServiceRating,
    avgPricingRating: shop.avgPricingRating,
    avgSelectionRating: shop.avgSelectionRating,
    reviewCount: shop.reviewCount,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    affiliateLinks: affiliateLinks.length > 0 ? affiliateLinks : undefined,
  }
}

// ── getShopsInBounds ──────────────────────────────────────

export async function getShopsInBounds(
  neLat: number,
  neLng: number,
  swLat: number,
  swLng: number,
): Promise<ShopSummary[]> {
  const rawShops = await db.shop.findMany({
    where: {
      status: { in: [ShopStatus.ACTIVE, ShopStatus.CLAIMED] },
      latitude: { gte: swLat, lte: neLat },
      longitude: { gte: swLng, lte: neLng },
    },
    take: 100,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      phone: true,
      imageUrl: true,
      services: true,
      brands: true,
    },
  })

  return rawShops.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    city: s.city,
    state: s.state,
    phone: s.phone,
    imageUrl: s.imageUrl,
    servicesCount: Array.isArray(s.services) ? (s.services as string[]).length : 0,
    brandsCount: Array.isArray(s.brands) ? (s.brands as string[]).length : 0,
  }))
}

// ── getShopForOwner ───────────────────────────────────────

export async function getShopForOwner(slug: string) {
  return db.shop.findUnique({
    where: { slug },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

// ── getShopLeadSummary ────────────────────────────────────

export async function getShopLeadSummary(shopId: string): Promise<{
  websiteClicks: number
  phoneClicks: number
  directionsClicks: number
}> {
  const [websiteClicks, phoneClicks, directionsClicks] = await Promise.all([
    db.leadEvent.count({ where: { shopId, eventType: LeadEventType.WEBSITE_CLICK } }),
    db.leadEvent.count({ where: { shopId, eventType: LeadEventType.PHONE_CLICK } }),
    db.leadEvent.count({ where: { shopId, eventType: LeadEventType.DIRECTIONS_CLICK } }),
  ])
  return { websiteClicks, phoneClicks, directionsClicks }
}

// ── getShopLeadsByDay ─────────────────────────────────────

export async function getShopLeadsByDay(
  shopId: string,
  days: number = 30,
): Promise<{ date: string; websiteClicks: number; phoneClicks: number; directionsClicks: number }[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const events = await db.leadEvent.findMany({
    where: { shopId, createdAt: { gte: since } },
    select: { eventType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const map = new Map<string, { websiteClicks: number; phoneClicks: number; directionsClicks: number }>()

  // Pre-fill all days
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    map.set(key, { websiteClicks: 0, phoneClicks: 0, directionsClicks: 0 })
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10)
    const entry = map.get(key)
    if (!entry) continue
    if (event.eventType === LeadEventType.WEBSITE_CLICK) entry.websiteClicks++
    else if (event.eventType === LeadEventType.PHONE_CLICK) entry.phoneClicks++
    else if (event.eventType === LeadEventType.DIRECTIONS_CLICK) entry.directionsClicks++
  }

  return Array.from(map.entries()).map(([date, counts]) => ({ date, ...counts }))
}

// ── getPendingClaims ──────────────────────────────────────

export async function getPendingClaims() {
  return db.shopClaimRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      shop: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ── getPendingSubmissions ─────────────────────────────────

export async function getPendingSubmissions() {
  return db.shop.findMany({
    where: { status: ShopStatus.PENDING_REVIEW },
    select: {
      id: true,
      name: true,
      shopType: true,
      city: true,
      state: true,
      createdAt: true,
      submittedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}
