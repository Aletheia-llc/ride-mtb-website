'use server'

import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { getWalletBalance, hasPendingPayout } from '@/modules/creators/lib/wallet'

const MINIMUM_PAYOUT_CENTS = 5000

export type RequestPayoutState = { errors: Record<string, string>; success?: boolean }

export async function requestPayout({ amountCents }: { amountCents: number }): Promise<RequestPayoutState> {
  try {
    const user = await requireAuth()
    const creator = await db.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!creator) return { errors: { general: 'Creator profile not found' } }

    if (amountCents < MINIMUM_PAYOUT_CENTS) {
      return { errors: { general: 'Minimum payout is $50' } }
    }

    const balance = await getWalletBalance(creator.id)
    if (balance < amountCents) {
      return { errors: { general: 'Insufficient balance' } }
    }

    const pending = await hasPendingPayout(creator.id)
    if (pending) {
      return { errors: { general: 'A payout request is already pending' } }
    }

    await db.payoutRequest.create({
      data: { creatorId: creator.id, amountCents, status: 'pending' },
    })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
