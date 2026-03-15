// src/modules/fantasy/lib/stripe.ts
import 'server-only'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export type MulliganPack = '1' | '3'

/** Create a Stripe Checkout session for a season pass purchase */
export async function createSeasonPassCheckout(params: {
  userId: string
  seriesId: string
  season: number
  seriesName: string
  returnUrl: string
}): Promise<string> {
  const stripe = getStripe()
  const priceId = process.env.STRIPE_SEASON_PASS_PRICE_ID
  if (!priceId) throw new Error('STRIPE_SEASON_PASS_PRICE_ID is not configured')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: 'fantasy_season_pass',
      userId: params.userId,
      seriesId: params.seriesId,
      season: String(params.season),
    },
    success_url: `${params.returnUrl}?pass=success`,
    cancel_url: params.returnUrl,
  })
  return session.url!
}

/** Create a Stripe Checkout session for a mulligan pack purchase */
export async function createMulliganCheckout(params: {
  userId: string
  pack: MulliganPack
  returnUrl: string
}): Promise<string> {
  const stripe = getStripe()
  const priceId = params.pack === '1'
    ? process.env.STRIPE_MULLIGAN_1_PRICE_ID
    : process.env.STRIPE_MULLIGAN_3_PRICE_ID
  if (!priceId) throw new Error(`STRIPE_MULLIGAN_${params.pack}_PRICE_ID is not configured`)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: 'fantasy_mulligan',
      userId: params.userId,
      pack: params.pack,
    },
    success_url: `${params.returnUrl}?mulligan=success`,
    cancel_url: params.returnUrl,
  })
  return session.url!
}

/** Verify a Stripe webhook signature for the fantasy webhook */
export async function constructFantasyStripeEvent(body: string, signature: string) {
  const stripe = getStripe()
  const secret = process.env.FANTASY_STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('FANTASY_STRIPE_WEBHOOK_SECRET is not configured')
  return stripe.webhooks.constructEvent(body, signature, secret)
}
