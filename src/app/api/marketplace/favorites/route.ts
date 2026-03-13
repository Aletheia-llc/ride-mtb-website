import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { toggleListingFavorite } from '@/modules/marketplace/lib/queries'
import { grantXP } from '@/modules/xp/lib/engine'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { listingId } = await request.json()
  if (!listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 })
  }

  const result = await toggleListingFavorite(listingId, session.user.id)

  if (result.favorited && result.sellerId && result.sellerId !== session.user.id) {
    grantXP({ userId: result.sellerId, event: 'listing_favorited', module: 'marketplace', refId: listingId }).catch((err) => {
      console.error('[marketplace/favorites] XP grant failed:', err)
    })
  }

  return NextResponse.json({ favorited: result.favorited })
}
