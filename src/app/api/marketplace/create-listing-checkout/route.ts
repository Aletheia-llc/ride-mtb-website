import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/lib/auth/config'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'
const LISTING_FEE_CENTS = 299 // $2.99

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { listingId: string; listingTitle: string }
    const { listingId, listingTitle } = body

    if (!listingId || !listingTitle) {
      return NextResponse.json({ error: 'Missing listingId or listingTitle' }, { status: 400 })
    }

    // eslint-disable-next-line no-restricted-imports
    const { db } = await import('@/lib/db/client')

    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { sellerId: true, status: true, title: true },
    })

    if (!listing || listing.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((listing.status as any) !== 'draft') {
      return NextResponse.json({ error: 'Listing is already active' }, { status: 400 })
    }

    // Check if payment already exists
    const existingPayment = await db.listingPayment.findUnique({
      where: { listingId },
      select: { stripeSessionId: true, status: true },
    })

    if (existingPayment?.status === 'paid') {
      return NextResponse.json({ error: 'Listing fee already paid' }, { status: 400 })
    }

    const stripe = getStripe()

    // DB upsert FIRST — create a pending payment record before calling Stripe.
    // If Stripe fails after a successful DB write, the pending record is harmless
    // (the webhook will never fire, so it stays pending and can be cleaned up).
    // The previous ordering (Stripe first, DB second) risked a dangling Stripe
    // session if the DB write failed after a successful charge initiation.
    await db.listingPayment.upsert({
      where: { listingId },
      update: { status: 'pending' },
      create: {
        listingId,
        userId: session.user.id,
        stripeSessionId: 'pending',
        amount: LISTING_FEE_CENTS,
      },
    })

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: LISTING_FEE_CENTS,
            product_data: {
              name: 'Listing Fee',
              description: `Activate listing: ${listingTitle}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/marketplace/${listingId}?payment=success`,
      cancel_url: `${BASE_URL}/marketplace/listings/new?step=review&listingId=${listingId}`,
      metadata: {
        listingId,
        userId: session.user.id,
        type: 'listing_fee',
      },
    })

    // Stamp the real Stripe session ID now that we have it
    await db.listingPayment.update({
      where: { listingId },
      data: { stripeSessionId: checkoutSession.id },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[api/marketplace/create-listing-checkout]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
