import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import type {
  TrailSystemType,
  TrailType,
  TrailStatus,
} from '@/generated/prisma/client'

// ── Types ─────────────────────────────────────────────────────

export interface TrailSystemFilters {
  systemType?: TrailSystemType
  status?: TrailStatus
  state?: string
  search?: string
}

export interface TrailListFilters {
  trailType?: TrailType
  minDifficulty?: number
  maxDifficulty?: number
  status?: TrailStatus
}

interface CreateTrailReviewInput {
  trailId: string
  userId: string
  rating: number
  flowRating?: number
  sceneryRating?: number
  technicalRating?: number
  maintenanceRating?: number
  comment?: string
  rideDate?: Date
  bikeType?: string
}

// ── 1. getTrailSystems ────────────────────────────────────────

export async function getTrailSystems(filters?: TrailSystemFilters) {
  return db.trailSystem.findMany({
    where: {
      ...(filters?.systemType && { systemType: filters.systemType }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.state && { state: filters.state }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { city: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { trails: true } },
    },
  })
}

// ── 2. getTrailSystemBySlug ───────────────────────────────────

export async function getTrailSystemBySlug(slug: string) {
  return db.trailSystem.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      city: true,
      state: true,
      country: true,
      latitude: true,
      longitude: true,
      websiteUrl: true,
      systemType: true,
      status: true,
      totalMiles: true,
      trailCount: true,
      regionId: true,
      coverImageUrl: true,
      phone: true,
      trailheadLat: true,
      trailheadLng: true,
      trailheadNotes: true,
      parkingInfo: true,
      seasonalNotes: true,
      passRequired: true,
      dogFriendly: true,
      eMtbAllowed: true,
      isFeatured: true,
      totalVertFt: true,
      averageRating: true,
      reviewCount: true,
      rideCount: true,
      importSource: true,
      externalId: true,
      submittedByUserId: true,
      createdAt: true,
      updatedAt: true,
      trails: {
        where: { status: 'open' },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          trailType: true,
          physicalDifficulty: true,
          technicalDifficulty: true,
          distance: true,
          elevationGain: true,
          status: true,
          currentCondition: true,
          hasGpsTrack: true,
          features: true,
          averageRating: true,
          gpsTrack: {
            select: {
              id: true,
              trackData: true,
              boundsNeLat: true,
              boundsNeLng: true,
              boundsSwLat: true,
              boundsSwLng: true,
            },
          },
        },
      },
      photos: {
        take: 5,
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        select: { url: true, caption: true, isCover: true },
      },
    },
  })
}

// ── 3. getTrailList ───────────────────────────────────────────

export async function getTrailList(
  systemSlug: string,
  filters?: TrailListFilters,
  page: number = 1,
) {
  const system = await db.trailSystem.findUnique({
    where: { slug: systemSlug },
    select: { id: true, name: true, slug: true },
  })

  if (!system) return null

  const where = {
    trailSystemId: system.id,
    ...(filters?.trailType && { trailType: filters.trailType }),
    ...(filters?.status && { status: filters.status }),
    ...((filters?.minDifficulty != null || filters?.maxDifficulty != null) && {
      physicalDifficulty: {
        ...(filters?.minDifficulty != null && { gte: filters.minDifficulty }),
        ...(filters?.maxDifficulty != null && { lte: filters.maxDifficulty }),
      },
    }),
  }

  const [trails, totalCount] = await Promise.all([
    db.trail.findMany({
      where,
      ...paginate(page),
      orderBy: { name: 'asc' },
      include: {
        system: {
          select: { name: true, slug: true },
        },
        gpsTrack: {
          select: { id: true },
        },
        _count: { select: { reviews: true } },
      },
    }),
    db.trail.count({ where }),
  ])

  return { system, trails, totalCount }
}

// ── 4. getTrailBySlug ─────────────────────────────────────────

export async function getTrailBySlug(slug: string) {
  return db.trail.findUnique({
    where: { slug },
    include: {
      system: {
        select: { name: true, slug: true, city: true, state: true },
      },
      gpsTrack: {
        select: {
          id: true,
          trackData: true,
          boundsNeLat: true,
          boundsNeLng: true,
          boundsSwLat: true,
          boundsSwLng: true,
          pointCount: true,
          elevationProfile: true,
          boundsJson: true,
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          flowRating: true,
          sceneryRating: true,
          technicalRating: true,
          maintenanceRating: true,
          comment: true,
          rideDate: true,
          bikeType: true,
          title: true,
          body: true,
          helpfulCount: true,
          createdAt: true,
          user: {
            select: { name: true, image: true },
          },
        },
      },
      photos: {
        take: 10,
        orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
        select: { url: true, caption: true, isCover: true },
      },
      pois: {
        where: { isApproved: true },
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          lat: true,
          lng: true,
          photoUrl: true,
        },
      },
      _count: { select: { reviews: true, favorites: true } },
    },
  })
}

// ── 5. getTrailReviews ────────────────────────────────────────

export async function getTrailReviews(trailId: string, page: number = 1) {
  const where = { trailId }

  const [reviews, totalCount] = await Promise.all([
    db.trailReview.findMany({
      where,
      ...paginate(page),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, image: true },
        },
      },
    }),
    db.trailReview.count({ where }),
  ])

  return { reviews, totalCount }
}

// ── 6. searchTrails ───────────────────────────────────────────

export async function searchTrails(query: string, limit: number = 10) {
  return db.trail.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { system: { name: { contains: query, mode: 'insensitive' as const } } },
        { system: { city: { contains: query, mode: 'insensitive' as const } } },
      ],
    },
    take: limit,
    orderBy: { name: 'asc' },
    include: {
      system: {
        select: { name: true, slug: true },
      },
    },
  })
}

// ── 7. createTrailReview ──────────────────────────────────────

export async function createTrailReview({
  trailId,
  userId,
  rating,
  flowRating,
  sceneryRating,
  technicalRating,
  maintenanceRating,
  comment,
  rideDate,
  bikeType,
}: CreateTrailReviewInput) {
  return db.trailReview.upsert({
    where: {
      trailId_userId: { trailId, userId },
    },
    create: {
      trailId,
      userId,
      rating,
      flowRating,
      sceneryRating,
      technicalRating,
      maintenanceRating,
      comment,
      rideDate,
      bikeType,
    },
    update: {
      rating,
      flowRating,
      sceneryRating,
      technicalRating,
      maintenanceRating,
      comment,
      rideDate,
      bikeType,
    },
  })
}

// ── 8. toggleTrailFavorite ────────────────────────────────────

export async function toggleTrailFavorite(trailId: string, userId: string) {
  const existing = await db.trailFavorite.findUnique({
    where: {
      trailId_userId: { trailId, userId },
    },
  })

  if (existing) {
    await db.trailFavorite.delete({
      where: { id: existing.id },
    })
    return { favorited: false }
  }

  await db.trailFavorite.create({
    data: { trailId, userId },
  })
  return { favorited: true }
}

// ── 9. isTrailFavorited ───────────────────────────────────────

export async function isTrailFavorited(
  trailId: string,
  userId: string,
): Promise<boolean> {
  const favorite = await db.trailFavorite.findUnique({
    where: {
      trailId_userId: { trailId, userId },
    },
    select: { id: true },
  })

  return favorite !== null
}

// ── 10. getRegions ────────────────────────────────────────────

export async function getRegions() {
  return db.trailRegion.findMany({
    include: { _count: { select: { systems: true } } },
    orderBy: { name: 'asc' },
  })
}

// ── 11. getRecentConditionReports ─────────────────────────────

export async function getRecentConditionReports(trailId: string, limit = 5) {
  return db.conditionReport.findMany({
    where: { trailId },
    include: { user: { select: { name: true } } },
    orderBy: { reportedAt: 'desc' },
    take: limit,
  })
}

// ── 12. getTrailSystemsInBounds ───────────────────────────────

export async function getTrailSystemsInBounds(
  neLat: number,
  neLng: number,
  swLat: number,
  swLng: number,
) {
  return db.trailSystem.findMany({
    where: {
      status: 'open',
      latitude: {
        gte: swLat,
        lte: neLat,
      },
      longitude: {
        gte: swLng,
        lte: neLng,
      },
    },
    include: {
      _count: { select: { trails: true } },
    },
  })
}

// ── 13. getFeaturedSystems ────────────────────────────────────

export async function getFeaturedSystems(limit = 6) {
  return db.trailSystem.findMany({
    where: { status: 'open', isFeatured: true },
    take: limit,
    orderBy: { reviewCount: 'desc' },
    include: {
      photos: {
        where: { isCover: true },
        take: 1,
        select: { url: true },
      },
      _count: { select: { trails: true } },
    },
  })
}

// ── 14. getSystemTrailsForMap ─────────────────────────────────

export async function getSystemTrailsForMap(systemId: string) {
  return db.trail.findMany({
    where: { trailSystemId: systemId, hasGpsTrack: true, status: 'open' },
    select: {
      id: true,
      name: true,
      slug: true,
      physicalDifficulty: true,
      technicalDifficulty: true,
      distance: true,
      gpsTrack: {
        select: { trackData: true },
      },
    },
  })
}

// ── 15. getHelpfulMarksByUser ─────────────────────────────────

export async function getHelpfulMarksByUser(
  userId: string,
  reviewIds: string[],
): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set()
  const marks = await db.trailReviewHelpful.findMany({
    where: { userId, reviewId: { in: reviewIds } },
    select: { reviewId: true },
  })
  return new Set(marks.map((m) => m.reviewId))
}
