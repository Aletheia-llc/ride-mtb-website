'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const offerAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(999999, 'Amount must be at most $999,999')

const makeOfferSchema = z.object({
  listingId: z.string().min(1),
  amount: offerAmountSchema,
  message: z.string().max(1000, 'Message must be at most 1000 characters').optional(),
})

const counterOfferSchema = z.object({
  offerId: z.string().min(1),
  amount: offerAmountSchema,
  message: z.string().max(1000, 'Message must be at most 1000 characters').optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amount: number | string | { toString(): string }): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Find or create a ListingConversation between buyer and seller for a listing.
 */
async function findOrCreateConversation(
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<string> {
  let conversation = await db.listingConversation.findFirst({
    where: { listingId, buyerId },
  })

  if (!conversation) {
    conversation = await db.listingConversation.create({
      data: { listingId, buyerId, sellerId },
    })
  }

  return conversation.id
}

/**
 * Send a system message to a conversation.
 * Inlined here since messages.ts is Task 7; avoids a circular dependency.
 */
async function sendSystemMessage(conversationId: string, body: string): Promise<void> {
  const conversation = await db.listingConversation.findFirst({
    where: { id: conversationId },
    select: { sellerId: true },
  })
  if (!conversation) return

  await db.listingMessage.create({
    data: {
      conversationId,
      senderId: conversation.sellerId,
      body,
      isSystemMessage: true,
    },
  })
}

// ---------------------------------------------------------------------------
// 1. Make an offer
// ---------------------------------------------------------------------------

export async function makeOffer(
  listingId: string,
  amount: number,
  message?: string,
) {
  const user = await requireAuth()
  const userId = user.id!

  const parsed = makeOfferSchema.safeParse({ listingId, amount, message })
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const listing = await db.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      status: true,
      acceptsOffers: true,
      minOfferPercent: true,
      price: true,
      title: true,
      slug: true,
    },
  })

  if (listing.status !== 'active') {
    throw new Error('This listing is no longer active.')
  }

  if (listing.sellerId === userId) {
    throw new Error('You cannot make an offer on your own listing.')
  }

  if (!listing.acceptsOffers) {
    throw new Error('This listing does not accept offers.')
  }

  if (listing.minOfferPercent) {
    const listingPrice = parseFloat(String(listing.price))
    const minAmount = (listing.minOfferPercent / 100) * listingPrice
    if (amount < minAmount) {
      throw new Error(
        `Offer must be at least ${listing.minOfferPercent}% of asking price (${formatAmount(minAmount)}).`,
      )
    }
  }

  const existingOffer = await db.offer.findFirst({
    where: { listingId, buyerId: userId, status: 'pending' },
  })

  if (existingOffer) {
    throw new Error('You already have a pending offer on this listing.')
  }

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 48)

  const offer = await db.offer.create({
    data: { listingId, buyerId: userId, amount, message: message ?? null, status: 'pending', expiresAt },
  })

  const conversationId = await findOrCreateConversation(listingId, userId, listing.sellerId)
  await sendSystemMessage(conversationId, `Buyer made an offer of ${formatAmount(amount)}`)

  revalidatePath('/buy-sell/my/offers')
  revalidatePath('/buy-sell/my/messages')
  revalidatePath(`/buy-sell/${listing.slug}`)

  return offer
}

// ---------------------------------------------------------------------------
// 2. Accept an offer
// ---------------------------------------------------------------------------

export async function acceptOffer(offerId: string) {
  const user = await requireAuth()
  const userId = user.id!

  const offer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true, slug: true } } },
  })

  if (offer.listing.sellerId !== userId) {
    throw new Error('Only the seller can accept offers.')
  }

  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  await db.offer.update({
    where: { id: offerId },
    data: { status: 'accepted', respondedAt: new Date() },
  })

  await db.offer.updateMany({
    where: { listingId: offer.listingId, id: { not: offerId }, status: 'pending' },
    data: { status: 'declined', respondedAt: new Date() },
  })

  await db.listing.update({
    where: { id: offer.listingId },
    data: { status: 'reserved' },
  })

  const conversationId = await findOrCreateConversation(offer.listingId, offer.buyerId, userId)
  await sendSystemMessage(conversationId, `Seller accepted offer of ${formatAmount(offer.amount)}`)

  revalidatePath('/buy-sell/my/offers')
  revalidatePath('/buy-sell/my/messages')
  revalidatePath(`/buy-sell/${offer.listing.slug}`)
  revalidatePath('/buy-sell/my/listings')
  revalidatePath('/buy-sell')

  return offer
}

// ---------------------------------------------------------------------------
// 3. Decline an offer
// ---------------------------------------------------------------------------

export async function declineOffer(offerId: string, message?: string) {
  const user = await requireAuth()
  const userId = user.id!

  const offer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true, slug: true } } },
  })

  if (offer.listing.sellerId !== userId) {
    throw new Error('Only the seller can decline offers.')
  }

  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  await db.offer.update({
    where: { id: offerId },
    data: { status: 'declined', respondedAt: new Date() },
  })

  const conversationId = await findOrCreateConversation(offer.listingId, offer.buyerId, userId)
  const systemMsg = message
    ? `Seller declined offer of ${formatAmount(offer.amount)}: "${message}"`
    : `Seller declined offer of ${formatAmount(offer.amount)}`
  await sendSystemMessage(conversationId, systemMsg)

  revalidatePath('/buy-sell/my/offers')
  revalidatePath('/buy-sell/my/messages')
  revalidatePath(`/buy-sell/${offer.listing.slug}`)

  return offer
}

// ---------------------------------------------------------------------------
// 4. Counter offer
// ---------------------------------------------------------------------------

export async function counterOffer(offerId: string, amount: number, message?: string) {
  const user = await requireAuth()
  const userId = user.id!

  const parsed = counterOfferSchema.safeParse({ offerId, amount, message })
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const offer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true, slug: true } } },
  })

  if (offer.listing.sellerId !== userId) {
    throw new Error('Only the seller can counter offers.')
  }

  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  await db.offer.update({
    where: { id: offerId },
    data: { status: 'countered', respondedAt: new Date() },
  })

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 48)

  const newOffer = await db.offer.create({
    data: {
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      amount,
      message: message ?? null,
      status: 'pending',
      parentOfferId: offerId,
      expiresAt,
    },
  })

  const conversationId = await findOrCreateConversation(offer.listingId, offer.buyerId, userId)
  await sendSystemMessage(conversationId, `Seller countered at ${formatAmount(amount)}`)

  revalidatePath('/buy-sell/my/offers')
  revalidatePath('/buy-sell/my/messages')
  revalidatePath(`/buy-sell/${offer.listing.slug}`)

  return newOffer
}

// ---------------------------------------------------------------------------
// 5. Withdraw an offer
// ---------------------------------------------------------------------------

export async function withdrawOffer(offerId: string) {
  const user = await requireAuth()
  const userId = user.id!

  const offer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true, slug: true } } },
  })

  if (offer.buyerId !== userId) {
    throw new Error('Only the buyer can withdraw an offer.')
  }

  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  await db.offer.update({
    where: { id: offerId },
    data: { status: 'withdrawn', respondedAt: new Date() },
  })

  const conversationId = await findOrCreateConversation(
    offer.listingId,
    userId,
    offer.listing.sellerId,
  )
  await sendSystemMessage(conversationId, `Buyer withdrew offer of ${formatAmount(offer.amount)}`)

  revalidatePath('/buy-sell/my/offers')
  revalidatePath('/buy-sell/my/messages')

  return offer
}
