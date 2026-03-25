import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { FacilityType } from '@/generated/prisma/client'

const TYPE_MAP: Record<string, FacilityType> = {
  skateparks: FacilityType.SKATEPARK,
  pumptracks: FacilityType.PUMPTRACK,
  bikeparks: FacilityType.BIKEPARK,
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const prismaType = type ? TYPE_MAP[type] : null
  if (!prismaType) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    const facilities = await db.facility.findMany({
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
        reviews: { select: { rating: true } },
      },
    })

    const pins = facilities.map((f) => {
      const ratings = f.reviews.map((r) => r.rating)
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null
      return {
        id: f.id,
        osmId: f.osmId,
        type: f.type,
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
        reviewCount: ratings.length,
      }
    })

    return NextResponse.json(pins)
  } catch (err) {
    console.error('[facilities] DB query failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
