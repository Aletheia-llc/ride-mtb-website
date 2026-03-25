'use server'

// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { FacilityType } from '@/generated/prisma/client'
import type { FacilityPin, FacilityWithStats, StateStats } from '../types'

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
    },
  })

  const facilityIds = facilities.map((f) => f.id)

  const aggs =
    facilityIds.length > 0
      ? await db.facilityReview.groupBy({
          by: ['facilityId'],
          where: { facilityId: { in: facilityIds } },
          _avg: { rating: true },
          _count: { id: true },
        })
      : []

  const aggMap = new Map(aggs.map((a) => [a.facilityId, a]))

  return facilities.map((f) => {
    const agg = aggMap.get(f.id)
    return {
      ...f,
      avgRating:
        agg?._avg.rating !== null && agg?._avg.rating !== undefined
          ? Math.round(agg._avg.rating * 10) / 10
          : null,
      reviewCount: agg?._count.id ?? 0,
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
    },
  })

  const facilityIds = facilities.map((f) => f.id)

  const aggs =
    facilityIds.length > 0
      ? await db.facilityReview.groupBy({
          by: ['facilityId'],
          where: { facilityId: { in: facilityIds } },
          _avg: { rating: true },
          _count: { id: true },
        })
      : []

  const aggMap = new Map(aggs.map((a) => [a.facilityId, a]))

  return facilities.map((f) => {
    const agg = aggMap.get(f.id)
    return {
      ...f,
      avgRating:
        agg?._avg.rating !== null && agg?._avg.rating !== undefined
          ? Math.round(agg._avg.rating * 10) / 10
          : null,
      reviewCount: agg?._count.id ?? 0,
    }
  })
}

export async function getFacilityBySlug(slug: string): Promise<FacilityWithStats | null> {
  const facility = await db.facility.findUnique({
    where: { slug },
  })
  if (!facility) return null

  const agg = await db.facilityReview.aggregate({
    where: { facilityId: facility.id },
    _avg: { rating: true },
    _count: { id: true },
  })

  return {
    ...facility,
    avgRating: agg._avg.rating !== null ? Math.round(agg._avg.rating * 10) / 10 : null,
    reviewCount: agg._count.id,
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
