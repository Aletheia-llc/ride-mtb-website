import { NextResponse } from 'next/server'
import { getListingBySlug } from '@/modules/marketplace/lib/queries'

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/marketplace/listings/[slug]
 * Returns the full listing detail (with photos and seller info).
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    const listing = await getListingBySlug(slug)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Listing detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
