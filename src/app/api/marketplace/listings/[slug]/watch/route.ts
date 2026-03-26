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

  try {
    const listing = await db.listing.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const { saved, saveCount } = await db.$transaction(
      async (tx) => {
        const existing = await tx.listingSave.findUnique({
          where: { userId_listingId: { userId, listingId: listing.id } },
        })

        if (existing) {
          await tx.listingSave.delete({
            where: { userId_listingId: { userId, listingId: listing.id } },
          })
          const updated = await tx.listing.update({
            where: { id: listing.id },
            data: { saveCount: { decrement: 1 } },
            select: { saveCount: true },
          })
          return { saved: false, saveCount: Math.max(0, updated.saveCount) }
        } else {
          await tx.listingSave.create({
            data: { userId, listingId: listing.id },
          })
          const updated = await tx.listing.update({
            where: { id: listing.id },
            data: { saveCount: { increment: 1 } },
            select: { saveCount: true },
          })
          return { saved: true, saveCount: updated.saveCount }
        }
      },
      { isolationLevel: 'Serializable' },
    )

    revalidatePath(`/marketplace/${slug}`)
    return NextResponse.json({ saved, saveCount })
  } catch (error) {
    console.error('Watch toggle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
