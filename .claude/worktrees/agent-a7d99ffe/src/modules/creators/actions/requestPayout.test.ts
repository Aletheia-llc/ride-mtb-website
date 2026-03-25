import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestPayout } from './requestPayout'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findUnique: vi.fn() },
    payoutRequest: { findFirst: vi.fn(), create: vi.fn() },
  },
}))
vi.mock('@/modules/creators/lib/wallet', () => ({
  getWalletBalance: vi.fn(),
  hasPendingPayout: vi.fn(),
}))

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getWalletBalance, hasPendingPayout } from '@/modules/creators/lib/wallet'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user_1', email: 'a@b.com', role: 'user' } as never)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({ id: 'creator_1' } as never)
  vi.mocked(getWalletBalance).mockResolvedValue(10000)
  vi.mocked(hasPendingPayout).mockResolvedValue(false)
  vi.mocked(db.payoutRequest.create).mockResolvedValue({ id: 'pr_1' } as never)
})

describe('requestPayout', () => {
  it('creates PayoutRequest when balance sufficient', async () => {
    const result = await requestPayout({ amountCents: 5000 })
    expect(result.errors).toEqual({})
    expect(result.success).toBe(true)
    expect(db.payoutRequest.create).toHaveBeenCalled()
  })

  it('rejects payout below $50 minimum', async () => {
    const result = await requestPayout({ amountCents: 4999 })
    expect(result.errors.general).toContain('50')
  })

  it('rejects payout when balance insufficient', async () => {
    vi.mocked(getWalletBalance).mockResolvedValue(3000)
    const result = await requestPayout({ amountCents: 5000 })
    expect(result.errors.general).toBeTruthy()
  })

  it('rejects when pending payout already exists', async () => {
    vi.mocked(hasPendingPayout).mockResolvedValue(true)
    const result = await requestPayout({ amountCents: 5000 })
    expect(result.errors.general).toBeTruthy()
  })
})
