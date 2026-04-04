import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { FacilityType } from '@/generated/prisma/client'

const TYPE_MAP: Record<string, FacilityType> = {
  skateparks: FacilityType.SKATEPARK,
  pumptracks: FacilityType.PUMPTRACK,
  bikeparks: FacilityType.BIKEPARK,
  bikeshops: FacilityType.BIKE_SHOP,
  campgrounds: FacilityType.CAMPGROUND,
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const prismaType = type ? TYPE_MAP[type] : null
  if (!prismaType) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    // Run facilities + review aggregation in parallel
    const [facilities, reviewStats] = await Promise.all([
      db.facility.findMany({
        where: { type: prismaType },
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
          phone: true,
          website: true,
          openingHours: true,
        },
      }),
      db.facilityReview.groupBy({
        by: ['facilityId'],
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ])

    const statsById = new Map(reviewStats.map((s) => [s.facilityId, s]))

    const pins = facilities.map((f) => {
      const stats = statsById.get(f.id)
      return {
        ...f,
        avgRating: stats?._avg.rating != null
          ? Math.round(stats._avg.rating * 10) / 10
          : null,
        reviewCount: stats?._count.rating ?? 0,
      }
    })

    return NextResponse.json(pins, {
      headers: {
        // Cache at CDN/browser for 5 minutes, serve stale for up to 1 hour while revalidating
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    console.error('[facilities] DB query failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
