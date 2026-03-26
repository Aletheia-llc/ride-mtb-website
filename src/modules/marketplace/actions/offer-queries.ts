'use server'

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import type { OfferWithDetails, OfferChainItem } from '@/modules/marketplace/types'

// ---------------------------------------------------------------------------
// 1. Get my offers sent
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

  const currentUser = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, image: true },
  })

  return offers.map((offer) => ({ ...offer, buyer: currentUser }))
}

// ---------------------------------------------------------------------------
// 2. Get my offers received
// ---------------------------------------------------------------------------

export async function getMyOffersReceived(): Promise<OfferWithDetails[]> {
  const user = await requireAuth()
  const userId = user.id!

  const offers = await db.offer.findMany({
    where: { listing: { sellerId: userId } },
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

  const buyerIds = [...new Set(offers.map((o) => o.buyerId))]
  const buyers = await db.user.findMany({
    where: { id: { in: buyerIds } },
    select: { id: true, name: true, image: true },
  })
  const buyerMap = new Map(buyers.map((b) => [b.id, b]))

  return offers.map((offer) => ({
    ...offer,
    buyer: buyerMap.get(offer.buyerId) ?? { id: offer.buyerId, name: 'Unknown', image: null },
  }))
}

// ---------------------------------------------------------------------------
// 3. Get offer chain
// ---------------------------------------------------------------------------

export async function getOfferChain(offerId: string): Promise<OfferChainItem[]> {
  const user = await requireAuth()
  const userId = user.id!

  const startOffer = await db.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: { listing: { select: { sellerId: true } } },
  })

  if (startOffer.buyerId !== userId && startOffer.listing.sellerId !== userId) {
    throw new Error('You are not a participant of this offer.')
  }

  // Walk up to find the root offer
  let current: typeof startOffer & { parentOfferId: string | null } = startOffer
  while (current.parentOfferId) {
    const parent = await db.offer.findUnique({
      where: { id: current.parentOfferId },
      include: { listing: { select: { sellerId: true } } },
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
      for (const child of o.counterOffers) queue.push(child.id)
    }
  }

  chain.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

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
    return { ...offer, sender: userMap.get(senderId) ?? defaultUser(senderId) }
  })
}
