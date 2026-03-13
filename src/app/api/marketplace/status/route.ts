import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { updateListingStatus } from '@/modules/marketplace/lib/queries'
import type { ListingStatus } from '@/modules/marketplace/types'

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { listingId, status } = await request.json()
  if (!listingId || !status) {
    return NextResponse.json({ error: 'listingId and status required' }, { status: 400 })
  }

  await updateListingStatus(listingId, session.user.id, status as ListingStatus)
  return NextResponse.json({ ok: true })
}
