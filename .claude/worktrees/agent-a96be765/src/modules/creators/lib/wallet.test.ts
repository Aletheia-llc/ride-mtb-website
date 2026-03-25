import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWalletBalance, hasPendingPayout } from './wallet'

vi.mock('@/lib/db/client', () => ({
  db: {
    walletTransaction: {
      aggregate: vi.fn(),
    },
    payoutRequest: {
      findFirst: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'

beforeEach(() => vi.clearAllMocks())

describe('getWalletBalance', () => {
  it('returns sum of amountCents', async () => {
    vi.mocked(db.walletTransaction.aggregate).mockResolvedValue({
      _sum: { amountCents: 12500 },
    } as never)
    expect(await getWalletBalance('creator_1')).toBe(12500)
  })

  it('returns 0 when no transactions exist', async () => {
    vi.mocked(db.walletTransaction.aggregate).mockResolvedValue({
      _sum: { amountCents: null },
    } as never)
    expect(await getWalletBalance('creator_1')).toBe(0)
  })
})

describe('hasPendingPayout', () => {
  it('returns true when pending request exists', async () => {
    vi.mocked(db.payoutRequest.findFirst).mockResolvedValue({ id: 'pr_1' } as never)
    expect(await hasPendingPayout('creator_1')).toBe(true)
  })

  it('returns false when no pending request', async () => {
    vi.mocked(db.payoutRequest.findFirst).mockResolvedValue(null)
    expect(await hasPendingPayout('creator_1')).toBe(false)
  })
})
