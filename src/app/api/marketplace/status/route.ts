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

  const validStatuses: ListingStatus[] = ['active', 'sold', 'reserved', 'expired', 'removed']
  if (!validStatuses.includes(status as ListingStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    await updateListingStatus(listingId, session.user.id, status as ListingStatus)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    const status_code = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status: status_code })
  }
}
