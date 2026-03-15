import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

const MIN_CENTS = 100 // $1.00
const MAX_CENTS = 100_000_00 // $100,000

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await rateLimit({ userId: authSession.user.id, action: 'donate-checkout', maxPerMinute: 10 })
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let amountCents: number
  try {
    const body = (await request.json()) as { amountCents?: unknown }
    amountCents = Number(body.amountCents)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    return NextResponse.json(
      { error: `Amount must be between $${MIN_CENTS / 100} and $${MAX_CENTS / 100}` },
      { status: 400 },
    )
  }

  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: 'Support Ride MTB',
            description: 'Your contribution helps keep Ride MTB free, independent, and rider-owned.',
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${BASE_URL}/donate?donated=true`,
    cancel_url: `${BASE_URL}/donate`,
    metadata: {
      type: 'donation',
      amountCents: String(amountCents),
    },
  })

  return NextResponse.json({ url: session.url })
}
