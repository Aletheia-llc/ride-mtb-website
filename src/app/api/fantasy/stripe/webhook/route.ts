// src/app/api/fantasy/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { constructFantasyStripeEvent } from '@/modules/fantasy/lib/stripe'
import { db } from '@/lib/db/client'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Awaited<ReturnType<typeof constructFantasyStripeEvent>>
  try {
    event = await constructFantasyStripeEvent(body, signature)
  } catch (err) {
    console.error('[fantasy/stripe] Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type as string) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata ?? {}

      if (meta.type === 'fantasy_season_pass') {
        const { userId, seriesId, season: seasonStr } = meta
        const season = parseInt(seasonStr)
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null

        // Provision season pass (idempotent via upsert on stripeSessionId)
        await db.seasonPassPurchase.upsert({
          where: { stripeSessionId: session.id },
          update: { stripePaymentIntentId: paymentIntentId },
          create: {
            userId,
            seriesId,
            season,
            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            status: 'active',
          },
        })

        // Ensure Championship League exists and auto-join user
        await ensureChampionshipLeagueMembership(userId, seriesId, season)
      }

      if (meta.type === 'fantasy_mulligan') {
        const { userId, pack } = meta
        const mulliganCount = pack === '3' ? 3 : 1

        // Upsert mulligan balance
        await db.mulliganBalance.upsert({
          where: { userId },
          update: { totalPurchased: { increment: mulliganCount } },
          create: { userId, totalPurchased: mulliganCount, totalUsed: 0 },
        })
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : null
      if (!paymentIntentId) break

      const pass = await db.seasonPassPurchase.findFirst({
        where: { stripePaymentIntentId: paymentIntentId, status: 'active' },
        select: { id: true, seriesId: true, season: true },
      })
      if (!pass) break

      // Only revoke if no scored events yet in this series+season
      const scoredEventCount = await db.fantasyEvent.count({
        where: { seriesId: pass.seriesId, status: 'scored' },
      })
      if (scoredEventCount === 0) {
        await db.seasonPassPurchase.update({
          where: { id: pass.id },
          data: { status: 'refunded' },
        })
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}

async function ensureChampionshipLeagueMembership(
  userId: string,
  seriesId: string,
  season: number
) {
  // Find or create the championship league for this series+season
  let league = await db.fantasyLeague.findFirst({
    where: { seriesId, season, isChampionship: true },
    select: { id: true },
  })

  if (!league) {
    // Lazy-create championship league on first season pass purchase
    // Use the first season pass holder as creator
    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    league = await db.fantasyLeague.create({
      data: {
        name: 'Championship League',
        seriesId,
        season,
        isChampionship: true,
        isPublic: false,
        inviteCode,
        createdByUserId: userId,
      },
      select: { id: true },
    })
  }

  // Auto-join (idempotent)
  await db.fantasyLeagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId } },
    update: {},
    create: { leagueId: league.id, userId },
  })
}
