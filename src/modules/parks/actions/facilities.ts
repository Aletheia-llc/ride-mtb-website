'use server'

// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import type { FacilityType, FacilityPin, FacilityWithStats, StateStats } from '../types'

const TYPE_MAP: Record<string, FacilityType> = {
  skateparks: 'SKATEPARK',
  pumptracks: 'PUMPTRACK',
  bikeparks: 'BIKEPARK',
}

export async function getFacilitiesByType(typeParam: string): Promise<FacilityPin[]> {
  const type = TYPE_MAP[typeParam]
  if (!type) return []

  const facilities = await db.facility.findMany({
    where: { type },
    select: {
      id: true,
      osmId: true,
      type: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      stateSlug: true,
      surface: true,
      lit: true,
      _count: { select: { reviews: true } },
      reviews: { select: { rating: true } },
    },
  })

  return facilities.map((f) => {
    const ratings = f.reviews.map((r) => r.rating)
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return {
      id: f.id,
      osmId: f.osmId,
      type: f.type as FacilityType,
      name: f.name,
      slug: f.slug,
      latitude: f.latitude,
      longitude: f.longitude,
      city: f.city,
      state: f.state,
      stateSlug: f.stateSlug,
      surface: f.surface,
      lit: f.lit,
      avgRating,
      reviewCount: f._count.reviews,
    }
  })
}

export async function getFacilitiesByState(
  stateSlug: string,
  type?: FacilityType,
): Promise<FacilityPin[]> {
  const facilities = await db.facility.findMany({
    where: { stateSlug, ...(type ? { type } : {}) },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      osmId: true,
      type: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      stateSlug: true,
      surface: true,
      lit: true,
      _count: { select: { reviews: true } },
      reviews: { select: { rating: true } },
    },
  })

  return facilities.map((f) => {
    const ratings = f.reviews.map((r) => r.rating)
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    return {
      id: f.id,
      osmId: f.osmId,
      type: f.type as FacilityType,
      name: f.name,
      slug: f.slug,
      latitude: f.latitude,
      longitude: f.longitude,
      city: f.city,
      state: f.state,
      stateSlug: f.stateSlug,
      surface: f.surface,
      lit: f.lit,
      avgRating,
      reviewCount: f._count.reviews,
    }
  })
}

export async function getFacilityBySlug(slug: string): Promise<FacilityWithStats | null> {
  const facility = await db.facility.findUnique({
    where: { slug },
    include: {
      _count: { select: { reviews: true } },
      reviews: { select: { rating: true } },
    },
  })
  if (!facility) return null

  const ratings = facility.reviews.map((r) => r.rating)
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null

  return {
    id: facility.id,
    osmId: facility.osmId,
    type: facility.type as FacilityType,
    name: facility.name,
    slug: facility.slug,
    latitude: facility.latitude,
    longitude: facility.longitude,
    address: facility.address,
    city: facility.city,
    state: facility.state,
    stateSlug: facility.stateSlug,
    operator: facility.operator,
    openingHours: facility.openingHours,
    surface: facility.surface,
    website: facility.website,
    phone: facility.phone,
    lit: facility.lit,
    fee: facility.fee,
    description: facility.description,
    lastSyncedAt: facility.lastSyncedAt,
    avgRating,
    reviewCount: facility._count.reviews,
  }
}

export async function getStateStats(): Promise<StateStats[]> {
  const rows = await db.facility.groupBy({
    by: ['stateSlug', 'state'],
    _count: { id: true },
    where: { stateSlug: { not: null } },
    orderBy: { stateSlug: 'asc' },
  })

  return rows
    .filter((r) => r.stateSlug && r.state)
    .map((r) => ({
      stateSlug: r.stateSlug!,
      stateName: r.state!,
      count: r._count.id,
    }))
}
