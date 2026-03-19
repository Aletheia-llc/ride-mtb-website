import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { constructStripeEvent } from '@/modules/creators/lib/stripe'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Awaited<ReturnType<typeof constructStripeEvent>>
  try {
    event = await constructStripeEvent(body, signature)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type as string) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account

      // Try SellerProfile first
      const sellerProfile = await db.sellerProfile.findFirst({
        where: { stripeAccountId: account.id }
      })

      if (sellerProfile) {
        await db.sellerProfile.update({
          where: { id: sellerProfile.id },
          data: { stripeOnboarded: account.details_submitted && account.charges_enabled }
        })
        break
      }

      // Try CreatorProfile (existing creators module)
      const creatorProfile = await db.creatorProfile.findFirst({
        where: { stripeAccountId: account.id }
      }).catch(() => null) // CreatorProfile may not exist yet

      if (creatorProfile && account.details_submitted && account.charges_enabled) {
        await db.creatorProfile.update({
          where: { id: creatorProfile.id },
          data: { status: 'active' }
        })
      }

      break
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const listingId = paymentIntent.metadata?.listingId
      const buyerId = paymentIntent.metadata?.buyerId
      const sellerId = paymentIntent.metadata?.sellerId
      const salePrice = paymentIntent.amount / 100 // convert from cents
      const platformFee = paymentIntent.application_fee_amount
        ? paymentIntent.application_fee_amount / 100
        : 0
      const shippingCost = paymentIntent.metadata?.shippingCost
        ? parseFloat(paymentIntent.metadata.shippingCost)
        : 0
      const totalCharged = salePrice

      if (listingId && buyerId && sellerId) {
        await db.transaction.upsert({
          where: { stripePaymentIntentId: paymentIntent.id },
          update: { status: 'paid' },
          create: {
            stripePaymentIntentId: paymentIntent.id,
            listingId,
            buyerId,
            sellerId,
            salePrice,
            shippingCost,
            platformFee,
            sellerPayout: salePrice - platformFee,
            totalCharged,
            status: 'paid',
          },
        })

        // Update listing status to reserved
        await db.listing.update({
          where: { id: listingId },
          data: { status: 'reserved' },
        }).catch(() => {}) // non-critical
      }
      break
    }
    case 'transfer.paid': {
      const transfer = event.data.object as { id: string }
      const payout = await db.payoutRequest.findFirst({
        where: { stripeTransferId: transfer.id },
        select: { id: true, creatorId: true, amountCents: true },
      })
      if (payout) {
        await db.payoutRequest.update({
          where: { id: payout.id },
          data: { status: 'completed' },
        })
        await db.walletTransaction.create({
          data: {
            creatorId: payout.creatorId,
            amountCents: -payout.amountCents,
            type: 'payout',
            payoutRequestId: payout.id,
          },
        })
      }
      break
    }
    case 'transfer.failed': {
      const transfer = event.data.object as { id: string }
      const payout = await db.payoutRequest.findFirst({
        where: { stripeTransferId: transfer.id },
        select: { id: true },
      })
      if (payout) {
        await db.payoutRequest.update({
          where: { id: payout.id },
          data: { status: 'failed' },
        })
      }
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
