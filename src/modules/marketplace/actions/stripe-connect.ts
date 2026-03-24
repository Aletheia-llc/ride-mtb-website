'use server'

import Stripe from 'stripe'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

// ---------------------------------------------------------------------------
// 1. Create Stripe Express account
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Express account for the seller and stores the account ID
 * on their SellerProfile. Safe to call multiple times — idempotent.
 */
export async function createStripeAccount(userId: string): Promise<string> {
  // Load existing profile
  const profile = await db.sellerProfile.findUnique({
    where: { userId },
    select: { id: true, stripeAccountId: true },
  })

  if (!profile) {
    throw new Error('Seller profile not found. Create a seller profile first.')
  }

  // If already created, return existing ID
  if (profile.stripeAccountId) {
    return profile.stripeAccountId
  }

  const stripe = getStripe()
  const account = await stripe.accounts.create({ type: 'express' })

  await db.sellerProfile.update({
    where: { id: profile.id },
    data: { stripeAccountId: account.id },
  })

  return account.id
}

// ---------------------------------------------------------------------------
// 2. Create onboarding link
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe Account Link for Express onboarding.
 * Returns the Stripe-hosted URL to redirect the seller to.
 */
export async function createOnboardingLink(userId: string): Promise<string> {
  await requireAuth()

  const profile = await db.sellerProfile.findUnique({
    where: { userId },
    select: { stripeAccountId: true },
  })

  if (!profile) {
    throw new Error('Seller profile not found.')
  }

  // Ensure stripe account exists
  const stripeAccountId = profile.stripeAccountId ?? (await createStripeAccount(userId))

  const stripe = getStripe()
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    return_url: `${BASE_URL}/marketplace/my/seller?onboarding=complete`,
    refresh_url: `${BASE_URL}/marketplace/my/seller?onboarding=refresh`,
    type: 'account_onboarding',
  })

  return link.url
}

// ---------------------------------------------------------------------------
// 3. Create payment intent
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe PaymentIntent for a listing purchase.
 * - If offerId is provided, uses the accepted offer price.
 * - Otherwise uses the listing's asking price.
 * - Applies platform fee and routes remainder to seller via transfer_data.
 * - Only valid for listings with fulfillment !== 'local_pickup' (shipped items).
 */
export async function createPaymentIntent(
  listingId: string,
  offerId?: string,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const user = await requireAuth()
  const buyerId = user.id!

  // Load listing with seller info
  const listing = await db.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      price: true,
      status: true,
      fulfillment: true,
      shippingCost: true,
      currency: true,
    },
  })

  // Verify listing is purchasable
  if (listing.status !== 'active' && listing.status !== 'reserved') {
    throw new Error('This listing is not available for purchase.')
  }

  // Buyer cannot purchase their own listing
  if (listing.sellerId === buyerId) {
    throw new Error('You cannot purchase your own listing.')
  }

  // Determine sale price
  let salePrice = Number(listing.price)
  if (offerId) {
    const offer = await db.offer.findUniqueOrThrow({
      where: { id: offerId },
      select: { listingId: true, buyerId: true, amount: true, status: true },
    })
    if (offer.listingId !== listingId) {
      throw new Error('Offer does not match the listing.')
    }
    if (offer.buyerId !== buyerId) {
      throw new Error('This offer does not belong to you.')
    }
    if (offer.status !== 'accepted') {
      throw new Error('Offer is not accepted.')
    }
    salePrice = Number(offer.amount)
  }

  // Get shipping cost
  const shippingCost = Number(listing.shippingCost ?? 0)

  // Total charged to buyer
  const totalAmount = salePrice + shippingCost

  // Platform fee
  const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT ?? '5')
  const platformFee = Math.round(totalAmount * 100 * (feePercent / 100))
  const totalCents = Math.round(totalAmount * 100)

  // Look up the seller's Stripe account
  const sellerProfile = await db.sellerProfile.findUnique({
    where: { userId: listing.sellerId },
    select: { stripeAccountId: true, stripeOnboarded: true },
  })

  if (!sellerProfile?.stripeAccountId || !sellerProfile.stripeOnboarded) {
    throw new Error('Seller has not completed payment onboarding. Cannot process payment.')
  }

  const stripe = getStripe()
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: (listing.currency ?? 'USD').toLowerCase(),
    application_fee_amount: platformFee,
    transfer_data: {
      destination: sellerProfile.stripeAccountId,
    },
    metadata: {
      listingId,
      buyerId,
      sellerId: listing.sellerId,
      offerId: offerId ?? '',
      salePrice: salePrice.toString(),
      shippingCost: shippingCost.toString(),
    },
  })

  if (!paymentIntent.client_secret) {
    throw new Error('Failed to create payment intent: no client secret returned.')
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  }
}

// ---------------------------------------------------------------------------
// 4. Get Stripe account status
// ---------------------------------------------------------------------------

export async function getStripeAccountStatus(userId: string): Promise<{
  hasAccount: boolean
  onboarded: boolean
  stripeAccountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
} | null> {
  const profile = await db.sellerProfile.findUnique({
    where: { userId },
    select: { stripeAccountId: true, stripeOnboarded: true },
  })

  if (!profile) return null

  if (!profile.stripeAccountId) {
    return {
      hasAccount: false,
      onboarded: false,
      stripeAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    }
  }

  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(profile.stripeAccountId)

  return {
    hasAccount: true,
    onboarded: profile.stripeOnboarded,
    stripeAccountId: profile.stripeAccountId,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  }
}
