import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { listingInclude } from '@/modules/marketplace/lib/queries'
import type { ListingWithPhotos } from '@/modules/marketplace/types'

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/marketplace/listings/[slug]/related
 * Returns up to 4 active listings in the same category, excluding the source listing.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { slug } = await params

    const listing = await db.listing.findUnique({
      where: { slug },
      select: { id: true, category: true },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const related = await db.listing.findMany({
      where: {
        status: 'active',
        category: listing.category,
        NOT: { id: listing.id },
      },
      include: listingInclude,
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    return NextResponse.json(related as ListingWithPhotos[])
  } catch (error) {
    console.error('Related listings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
