'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

// ---------------------------------------------------------------------------
// Start a conversation (creates ListingConversation + first ListingMessage)
// ---------------------------------------------------------------------------

export async function startConversation(
  listingId: string,
  initialMessage: string,
): Promise<{ conversationId: string }> {
  const user = await requireAuth()
  const buyerId = user.id

  if (!initialMessage?.trim()) {
    throw new Error('Message cannot be empty')
  }

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, slug: true, status: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (listing.status !== 'active') {
    throw new Error('This listing is no longer available')
  }

  if (listing.sellerId === buyerId) {
    throw new Error('You cannot message yourself about your own listing')
  }

  // Upsert conversation (@@unique on listingId + buyerId)
  const conversation = await db.listingConversation.upsert({
    where: {
      listingId_buyerId: { listingId, buyerId },
    },
    create: {
      listingId,
      buyerId,
      sellerId: listing.sellerId,
      lastMessageAt: new Date(),
      sellerUnread: 1,
    },
    update: {
      lastMessageAt: new Date(),
      sellerUnread: { increment: 1 },
    },
  })

  await db.listingMessage.create({
    data: {
      conversationId: conversation.id,
      senderId: buyerId,
      body: initialMessage.trim(),
    },
  })

  revalidatePath(`/buy-sell/${listing.slug}`)
  revalidatePath('/buy-sell/messages')

  return { conversationId: conversation.id }
}

// ---------------------------------------------------------------------------
// Send a message to an existing conversation
// ---------------------------------------------------------------------------

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  if (!content?.trim()) {
    throw new Error('Message cannot be empty')
  }

  const conversation = await db.listingConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  })

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const isBuyer = conversation.buyerId === userId
  const isSeller = conversation.sellerId === userId

  if (!isBuyer && !isSeller) {
    throw new Error('You are not a participant in this conversation')
  }

  await db.listingMessage.create({
    data: {
      conversationId,
      senderId: userId,
      body: content.trim(),
    },
  })

  // Increment unread count for the other party
  await db.listingConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      ...(isBuyer
        ? { sellerUnread: { increment: 1 } }
        : { buyerUnread: { increment: 1 } }),
    },
  })

  revalidatePath('/buy-sell/messages')
  revalidatePath(`/buy-sell/messages/${conversationId}`)
}

// ---------------------------------------------------------------------------
// Get all conversations for the current user (as buyer or seller)
// ---------------------------------------------------------------------------

export async function getConversations() {
  const user = await requireAuth()
  const userId = user.id

  const conversations = await db.listingConversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          photos: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      },
      buyer: {
        select: { id: true, name: true, image: true },
      },
      seller: {
        select: { id: true, name: true, image: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  return conversations
}

// ---------------------------------------------------------------------------
// Get a single conversation with all messages
// ---------------------------------------------------------------------------

export async function getConversation(conversationId: string) {
  const user = await requireAuth()
  const userId = user.id

  const conversation = await db.listingConversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          status: true,
          photos: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
      },
      buyer: {
        select: { id: true, name: true, image: true },
      },
      seller: {
        select: { id: true, name: true, image: true },
      },
      messages: {
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const isBuyer = conversation.buyerId === userId
  const isSeller = conversation.sellerId === userId

  if (!isBuyer && !isSeller) {
    throw new Error('You are not a participant in this conversation')
  }

  return conversation
}

// ---------------------------------------------------------------------------
// Mark a conversation as read for the current user
// ---------------------------------------------------------------------------

export async function markConversationRead(conversationId: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  const conversation = await db.listingConversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, sellerId: true },
  })

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const isBuyer = conversation.buyerId === userId
  const isSeller = conversation.sellerId === userId

  if (!isBuyer && !isSeller) {
    throw new Error('You are not a participant in this conversation')
  }

  await db.listingConversation.update({
    where: { id: conversationId },
    data: {
      ...(isBuyer ? { buyerUnread: 0 } : { sellerUnread: 0 }),
    },
  })

  revalidatePath(`/buy-sell/messages/${conversationId}`)
  revalidatePath('/buy-sell/messages')
}
