'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import type { OfferWithDetails, OfferChainItem } from '@/modules/marketplace/types'

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
 * Adaptation: standalone used `prisma.conversation` → monolith uses `db.listingConversation`
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
      data: {
        listingId,
        buyerId,
        sellerId,
      },
    })
  }

  return conversation.id
}

/**
 * Send a system message to a conversation.
 * Inlined here since messages.ts is Task 7; avoids a circular dependency.
 */
async function sendSystemMessage(conversationId: string, body: string): Promise<void> {
  // System messages use a sentinel senderId; the sender must exist as a User.
  // We find the conversation's seller as the system message sender.
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

  // Validate
  const parsed = makeOfferSchema.safeParse({ listingId, amount, message })
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  // Get listing
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

  // Verify listing is active
  if (listing.status !== 'active') {
    throw new Error('This listing is no longer active.')
  }

  // Verify user is not the seller
  if (listing.sellerId === userId) {
    throw new Error('You cannot make an offer on your own listing.')
  }

  // Verify listing accepts offers
  if (!listing.acceptsOffers) {
    throw new Error('This listing does not accept offers.')
  }

  // Check min offer percent
  if (listing.minOfferPercent) {
    const listingPrice = parseFloat(String(listing.price))
    const minAmount = (listing.minOfferPercent / 100) * listingPrice
    if (amount < minAmount) {
      throw new Error(
        `Offer must be at least ${listing.minOfferPercent}% of asking price (${formatAmount(minAmount)}).`,
      )
    }
  }

  // Check no existing pending offer from this buyer on this listing
  const existingOffer = await db.offer.findFirst({
    where: {
      listingId,
      buyerId: userId,
      status: 'pending',
    },
  })

  if (existingOffer) {
    throw new Error('You already have a pending offer on this listing.')
  }

  // Create offer with 48-hour expiry
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 48)

  const offer = await db.offer.create({
    data: {
      listingId,
      buyerId: userId,
      amount,
      message: message ?? null,
      status: 'pending',
      expiresAt,
    },
  })

  // Send system message to conversation
  const conversationId = await findOrCreateConversation(
    listingId,
    userId,
    listing.sellerId,
  )
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

  // Get offer with listing
  const offer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: {
      listing: {
        select: { id: true, sellerId: true, slug: true },
      },
    },
  })

  // Verify user is the listing seller
  if (offer.listing.sellerId !== userId) {
    throw new Error('Only the seller can accept offers.')
  }

  // Verify offer is pending
  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  // Set status=accepted + respondedAt
  await db.offer.update({
    where: { id: offerId },
    data: {
      status: 'accepted',
      respondedAt: new Date(),
    },
  })

  // Decline all other pending offers on same listing
  await db.offer.updateMany({
    where: {
      listingId: offer.listingId,
      id: { not: offerId },
      status: 'pending',
    },
    data: {
      status: 'declined',
      respondedAt: new Date(),
    },
  })

  // Set listing status to reserved
  await db.listing.update({
    where: { id: offer.listingId },
    data: { status: 'reserved' },
  })

  // Send system message
  const conversationId = await findOrCreateConversation(
    offer.listingId,
    offer.buyerId,
    userId,
  )
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
    include: {
      listing: {
        select: { id: true, sellerId: true, slug: true },
      },
    },
  })

  // Verify user is the seller
  if (offer.listing.sellerId !== userId) {
    throw new Error('Only the seller can decline offers.')
  }

  // Verify offer is pending
  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  // Set status=declined + respondedAt
  await db.offer.update({
    where: { id: offerId },
    data: {
      status: 'declined',
      respondedAt: new Date(),
    },
  })

  // Send system message
  const conversationId = await findOrCreateConversation(
    offer.listingId,
    offer.buyerId,
    userId,
  )

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

export async function counterOffer(
  offerId: string,
  amount: number,
  message?: string,
) {
  const user = await requireAuth()
  const userId = user.id!

  // Validate
  const parsed = counterOfferSchema.safeParse({ offerId, amount, message })
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const offer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: {
      listing: {
        select: { id: true, sellerId: true, slug: true },
      },
    },
  })

  // Verify user is the seller
  if (offer.listing.sellerId !== userId) {
    throw new Error('Only the seller can counter offers.')
  }

  // Verify offer is pending
  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  // Set original offer status to countered
  await db.offer.update({
    where: { id: offerId },
    data: {
      status: 'countered',
      respondedAt: new Date(),
    },
  })

  // Create NEW counter offer with parentOfferId
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

  // Send system message
  const conversationId = await findOrCreateConversation(
    offer.listingId,
    offer.buyerId,
    userId,
  )
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
    include: {
      listing: {
        select: { id: true, sellerId: true, slug: true },
      },
    },
  })

  // Verify user is the buyer
  if (offer.buyerId !== userId) {
    throw new Error('Only the buyer can withdraw an offer.')
  }

  // Verify offer is pending
  if (offer.status !== 'pending') {
    throw new Error('This offer is no longer pending.')
  }

  await db.offer.update({
    where: { id: offerId },
    data: {
      status: 'withdrawn',
      respondedAt: new Date(),
    },
  })

  // Send system message
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

// ---------------------------------------------------------------------------
// 6. Get my offers sent
// ---------------------------------------------------------------------------

export async function getMyOffersSent(): Promise<OfferWithDetails[]> {
  const user = await requireAuth()
  const userId = user.id!

  const offers = await db.offer.findMany({
    where: { buyerId: userId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          photos: {
            where: { isCover: true },
            select: { url: true, isCover: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Attach buyer info (current user)
  const currentUser = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, image: true },
  })

  return offers.map((offer) => ({
    ...offer,
    buyer: currentUser,
  }))
}

// ---------------------------------------------------------------------------
// 7. Get my offers received
// ---------------------------------------------------------------------------

export async function getMyOffersReceived(): Promise<OfferWithDetails[]> {
  const user = await requireAuth()
  const userId = user.id!

  const offers = await db.offer.findMany({
    where: {
      listing: { sellerId: userId },
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          photos: {
            where: { isCover: true },
            select: { url: true, isCover: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch all buyer info
  const buyerIds = [...new Set(offers.map((o) => o.buyerId))]
  const buyers = await db.user.findMany({
    where: { id: { in: buyerIds } },
    select: { id: true, name: true, image: true },
  })
  const buyerMap = new Map(buyers.map((b) => [b.id, b]))

  return offers.map((offer) => ({
    ...offer,
    buyer: buyerMap.get(offer.buyerId) ?? {
      id: offer.buyerId,
      name: 'Unknown',
      image: null,
    },
  }))
}

// ---------------------------------------------------------------------------
// 8. Get offer chain
// ---------------------------------------------------------------------------

export async function getOfferChain(offerId: string): Promise<OfferChainItem[]> {
  const user = await requireAuth()
  const userId = user.id!

  // Find the offer
  const startOffer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: {
      listing: {
        select: { sellerId: true },
      },
    },
  })

  // Verify user is either buyer or seller
  if (startOffer.buyerId !== userId && startOffer.listing.sellerId !== userId) {
    throw new Error('You are not a participant of this offer.')
  }

  // Walk up to find the root offer
  let current: typeof startOffer & { parentOfferId: string | null } = startOffer
  while (current.parentOfferId) {
    const parent = await db.offer.findUnique({
      where: { id: current.parentOfferId },
      include: {
        listing: { select: { sellerId: true } },
      },
    })
    if (!parent) break
    current = parent
  }
  const rootId = current.id

  // BFS to collect all offers in the chain
  type OfferNode = Awaited<ReturnType<typeof db.offer.findUniqueOrThrow>> & {
    listing: { sellerId: string }
    counterOffers: { id: string }[]
  }

  const chain: OfferNode[] = []
  const queue = [rootId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const o = await db.offer.findUnique({
      where: { id },
      include: {
        listing: { select: { sellerId: true } },
        counterOffers: { select: { id: true } },
      },
    })

    if (o) {
      chain.push(o as OfferNode)
      for (const child of o.counterOffers) {
        queue.push(child.id)
      }
    }
  }

  // Sort chronologically
  chain.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const sellerId = chain[0]?.listing.sellerId
  const buyerId = chain[0]?.buyerId

  const senderIds = new Set<string>()
  if (sellerId) senderIds.add(sellerId)
  if (buyerId) senderIds.add(buyerId)

  const users = await db.user.findMany({
    where: { id: { in: [...senderIds] } },
    select: { id: true, name: true, image: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))
  const defaultUser = (id: string) => ({ id, name: 'Unknown', image: null })

  function getSenderFromChain(
    c: Array<{ id: string; parentOfferId: string | null }>,
    index: number,
  ): string {
    const item = c[index]
    if (!item.parentOfferId) return buyerId!
    const parentIndex = c.findIndex((o) => o.id === item.parentOfferId)
    if (parentIndex < 0) return index % 2 === 0 ? buyerId! : sellerId!
    const parentSender = getSenderFromChain(c, parentIndex)
    return parentSender === buyerId ? sellerId! : buyerId!
  }

  return chain.map((offer, index) => {
    const senderId = getSenderFromChain(chain, index)
    return {
      ...offer,
      sender: userMap.get(senderId) ?? defaultUser(senderId),
    }
  })
}
