'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  listingId: z.string().min(1),
  amount: z.number().positive().max(999999),
  message: z.string().max(1000).optional(),
})

export async function makeOffer(input: { listingId: string; amount: number; message?: string }) {
  const user = await requireAuth()
  const { listingId, amount, message } = schema.parse(input)

  const listing = await db.listing.findUnique({
    where: { id: listingId, status: 'active' },
    select: { id: true, sellerId: true, acceptsOffers: true, minOfferPercent: true, price: true },
  })
  if (!listing) throw new Error('Listing not found or unavailable')
  if (!listing.acceptsOffers) throw new Error('This listing does not accept offers')
  if (listing.sellerId === user.id) throw new Error('Cannot offer on your own listing')

  if (listing.minOfferPercent) {
    const minAmount = listing.price * (listing.minOfferPercent / 100)
    if (amount < minAmount) throw new Error(`Minimum offer is ${Math.round(listing.minOfferPercent)}% of asking price`)
  }

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72h

  const offer = await db.offer.create({
    data: {
      listingId,
      buyerId: user.id,
      amount,
      message,
      expiresAt,
    },
  })

  revalidatePath(`/marketplace/${listing.id}`)
  return offer
}
