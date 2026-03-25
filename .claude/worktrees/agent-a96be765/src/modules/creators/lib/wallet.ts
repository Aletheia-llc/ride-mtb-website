import 'server-only'
import { db } from '@/lib/db/client'

export async function getWalletBalance(creatorProfileId: string): Promise<number> {
  const result = await db.walletTransaction.aggregate({
    where: { creatorId: creatorProfileId },
    _sum: { amountCents: true },
  })
  return result._sum.amountCents ?? 0
}

export interface WalletTransactionRow {
  id: string
  amountCents: number
  type: string
  createdAt: Date
}

export async function getWalletTransactions(
  creatorProfileId: string,
  limit = 20,
): Promise<WalletTransactionRow[]> {
  return db.walletTransaction.findMany({
    where: { creatorId: creatorProfileId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, amountCents: true, type: true, createdAt: true },
  })
}

export async function hasPendingPayout(creatorProfileId: string): Promise<boolean> {
  const existing = await db.payoutRequest.findFirst({
    where: { creatorId: creatorProfileId, status: 'pending' },
    select: { id: true },
  })
  return existing !== null
}
