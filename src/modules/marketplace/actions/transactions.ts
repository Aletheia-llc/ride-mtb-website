'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculatePlatformFee(amount: number): number {
  const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT ?? '5')
  // Calculate fee in cents then convert back to dollars for storage
  const feeCents = Math.round(amount * 100 * (feePercent / 100))
  return feeCents / 100
}

// ---------------------------------------------------------------------------
// createTransaction
// ---------------------------------------------------------------------------

/**
 * Creates a Transaction record after a successful Stripe payment.
 * Called by the Stripe webhook handler once payment_intent.succeeded fires.
 */
export async function createTransaction(
  listingId: string,
  buyerId: string,
  amount: number,
  stripePaymentIntentId: string,
  fulfillmentType: string,
) {
  await requireAuth()

  const listing = await db.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: { sellerId: true, shippingCost: true },
  })

  const salePrice = amount
  const shippingCost = Number(listing.shippingCost ?? 0)
  const platformFee = calculatePlatformFee(salePrice)
  const sellerPayout = salePrice - platformFee
  const totalCharged = salePrice + shippingCost

  const transaction = await db.transaction.create({
    data: {
      listingId,
      buyerId,
      sellerId: listing.sellerId,
      salePrice,
      shippingCost,
      platformFee,
      sellerPayout,
      totalCharged,
      stripePaymentIntentId,
      status: 'paid',
    },
    include: {
      listing: true,
      buyer: true,
      seller: true,
    },
  })

  revalidatePath('/marketplace')
  revalidatePath(`/marketplace/my`)

  return transaction
}

// ---------------------------------------------------------------------------
// updateTransactionStatus
// ---------------------------------------------------------------------------

/**
 * Updates the status of a transaction.
 * Only the buyer or seller of the transaction may call this.
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: string,
  trackingNumber?: string,
) {
  const user = await requireAuth()

  const transaction = await db.transaction.findUniqueOrThrow({
    where: { id: transactionId },
  })

  if (transaction.buyerId !== user.id && transaction.sellerId !== user.id) {
    throw new Error('Not authorized to update this transaction.')
  }

  const updateData: Record<string, unknown> = { status }
  if (trackingNumber !== undefined) {
    updateData.trackingNumber = trackingNumber
  }

  const updated = await db.transaction.update({
    where: { id: transactionId },
    data: updateData,
    include: {
      listing: true,
      buyer: true,
      seller: true,
    },
  })

  revalidatePath('/marketplace/my')

  return updated
}

// ---------------------------------------------------------------------------
// addTracking
// ---------------------------------------------------------------------------

/**
 * Adds tracking info to a transaction and sets status to 'shipped'.
 * Only the seller may add tracking.
 */
export async function addTracking(
  transactionId: string,
  trackingNumber: string,
  carrier: string,
) {
  const user = await requireAuth()

  const transaction = await db.transaction.findUniqueOrThrow({
    where: { id: transactionId },
  })

  if (transaction.sellerId !== user.id) {
    throw new Error('Only the seller can add tracking information.')
  }

  const updated = await db.transaction.update({
    where: { id: transactionId },
    data: {
      trackingNumber,
      trackingCarrier: carrier,
      status: 'shipped',
      shippedAt: new Date(),
    },
    include: {
      listing: true,
      buyer: true,
      seller: true,
    },
  })

  revalidatePath('/marketplace/my')

  return updated
}

// ---------------------------------------------------------------------------
// getTransaction
// ---------------------------------------------------------------------------

/**
 * Returns full details for a single transaction.
 * Only the buyer, seller, or an admin can view a transaction.
 */
export async function getTransaction(transactionId: string) {
  const user = await requireAuth()

  const transaction = await db.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: {
      listing: {
        include: { photos: { take: 1, orderBy: { sortOrder: 'asc' } } },
      },
      buyer: { select: { id: true, name: true, image: true } },
      seller: { select: { id: true, name: true, image: true } },
    },
  })

  if (
    transaction.buyerId !== user.id &&
    transaction.sellerId !== user.id &&
    user.role !== 'admin'
  ) {
    throw new Error('Not authorized to view this transaction.')
  }

  return transaction
}

// ---------------------------------------------------------------------------
// getMyPurchases
// ---------------------------------------------------------------------------

/**
 * Returns all transactions where the current user is the buyer.
 */
export async function getMyPurchases() {
  const user = await requireAuth()

  return db.transaction.findMany({
    where: { buyerId: user.id },
    include: {
      listing: {
        include: { photos: { take: 1, orderBy: { sortOrder: 'asc' } } },
      },
      seller: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ---------------------------------------------------------------------------
// getMySales
// ---------------------------------------------------------------------------

/**
 * Returns all transactions where the current user is the seller.
 */
export async function getMySales() {
  const user = await requireAuth()

  return db.transaction.findMany({
    where: { sellerId: user.id },
    include: {
      listing: {
        include: { photos: { take: 1, orderBy: { sortOrder: 'asc' } } },
      },
      buyer: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
