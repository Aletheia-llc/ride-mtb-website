import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { constructStripeEvent } from '@/modules/creators/lib/stripe'

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
      const account = event.data.object as {
        id: string
        details_submitted: boolean
        charges_enabled: boolean
      }
      if (account.details_submitted && account.charges_enabled) {
        const profile = await db.creatorProfile.findFirst({
          where: { stripeAccountId: account.id },
        })
        if (profile) {
          await db.creatorProfile.update({
            where: { id: profile.id },
            data: { status: 'active' },
          })
        }
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
