import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * POST /api/marketplace/listings/[slug]/watch
 * Toggles the watch (save) state for the authenticated user.
 * Returns { saved: boolean, saveCount: number }.
 */
export async function POST(_req: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const userId = session.user.id

  const listing = await db.listing.findUnique({
    where: { slug },
    select: { id: true, slug: true, saveCount: true },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const existing = await db.listingSave.findUnique({
    where: { userId_listingId: { userId, listingId: listing.id } },
  })

  let saved: boolean
  let saveCount: number

  if (existing) {
    // Unsave
    await db.listingSave.delete({
      where: { userId_listingId: { userId, listingId: listing.id } },
    })
    const updated = await db.listing.update({
      where: { id: listing.id },
      data: { saveCount: { decrement: 1 } },
      select: { saveCount: true },
    })
    saved = false
    saveCount = Math.max(0, updated.saveCount)
  } else {
    // Save
    await db.listingSave.create({
      data: { userId, listingId: listing.id },
    })
    const updated = await db.listing.update({
      where: { id: listing.id },
      data: { saveCount: { increment: 1 } },
      select: { saveCount: true },
    })
    saved = true
    saveCount = updated.saveCount
  }

  revalidatePath(`/marketplace/${slug}`)

  return NextResponse.json({ saved, saveCount })
}
