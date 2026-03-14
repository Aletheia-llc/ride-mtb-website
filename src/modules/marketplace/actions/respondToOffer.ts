'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function acceptOffer(offerId: string) {
  const user = await requireAuth()

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true, slug: true } } },
  })
  if (!offer) throw new Error('Offer not found')
  if (offer.listing.sellerId !== user.id) throw new Error('Not your listing')
  if (offer.status !== 'pending') throw new Error('Offer is no longer pending')

  await db.offer.update({ where: { id: offerId }, data: { status: 'accepted', respondedAt: new Date() } })
  // Decline all other pending offers on this listing
  await db.offer.updateMany({
    where: { listingId: offer.listingId, status: 'pending', id: { not: offerId } },
    data: { status: 'declined', respondedAt: new Date() },
  })

  revalidatePath(`/marketplace/${offer.listing.slug}`)
  return { success: true }
}

export async function declineOffer(offerId: string) {
  const user = await requireAuth()

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { listing: { select: { sellerId: true, slug: true } } },
  })
  if (!offer) throw new Error('Offer not found')
  if (offer.listing.sellerId !== user.id) throw new Error('Not your listing')

  await db.offer.update({ where: { id: offerId }, data: { status: 'declined', respondedAt: new Date() } })
  revalidatePath(`/marketplace/${offer.listing.slug}`)
  return { success: true }
}

export async function counterOffer(offerId: string, amount: number, message?: string) {
  const user = await requireAuth()

  if (amount <= 0 || amount > 999999) throw new Error('Invalid counter-offer amount')

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true, slug: true } } },
  })
  if (!offer) throw new Error('Offer not found')
  if (offer.listing.sellerId !== user.id) throw new Error('Not your listing')
  if (offer.status !== 'pending') throw new Error('Offer is no longer pending')

  await db.offer.update({ where: { id: offerId }, data: { status: 'countered', respondedAt: new Date() } })

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
  const counter = await db.offer.create({
    data: {
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      amount,
      message,
      parentOfferId: offerId,
      expiresAt,
    },
  })

  revalidatePath(`/marketplace/${offer.listing.slug}`)
  return counter
}
