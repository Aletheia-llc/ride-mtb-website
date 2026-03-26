'use server'

import Stripe from 'stripe'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

/**
 * Creates a Stripe Checkout Session for the current user's cart.
 * Returns the Stripe-hosted checkout URL to redirect the buyer to.
 */
export async function createMerchCheckoutSession(): Promise<string> {
  const user = await requireAuth()

  const items = await db.cartItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          stripePriceId: true,
          inStock: true,
        },
      },
    },
  })

  if (items.length === 0) {
    throw new Error('Your cart is empty.')
  }

  const outOfStock = items.filter((item) => !item.product.inStock)
  if (outOfStock.length > 0) {
    const names = outOfStock.map((i) => i.product.name).join(', ')
    throw new Error(`Some items are out of stock: ${names}`)
  }

  const stripe = getStripe()

  // Build line items — use stripePriceId when available, otherwise create ad-hoc price
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    if (item.product.stripePriceId) {
      return {
        price: item.product.stripePriceId,
        quantity: item.quantity,
      }
    }
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          metadata: { productId: item.product.id, variantKey: item.variantKey },
        },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.quantity,
    }
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${BASE_URL}/merch/cart/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/merch/cart`,
    customer_email: user.email ?? undefined,
    metadata: {
      userId: user.id,
    },
    shipping_address_collection: {
      allowed_countries: ['US', 'CA'],
    },
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session.')
  }

  return session.url
}
