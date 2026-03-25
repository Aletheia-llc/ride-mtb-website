import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    adImpression: { findUnique: vi.fn(), update: vi.fn() },
    creatorVideo: { findUnique: vi.fn() },
    walletTransaction: { create: vi.fn() },
  },
}))

import { db } from '@/lib/db/client'

const now = new Date()
const freshImpression = {
  id: 'imp_1',
  status: 'pending',
  createdAt: new Date(now.getTime() - 60_000), // 1 min ago
  campaignId: 'camp_1',
  videoId: 'vid_1',
  campaign: { cpmCents: 1000 },
  video: { creatorId: 'creator_1', creator: { revenueSharePct: 70 } },
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(db.adImpression.findUnique).mockResolvedValue(freshImpression as never)
  vi.mocked(db.adImpression.update).mockResolvedValue({ ...freshImpression, status: 'confirmed' } as never)
  vi.mocked(db.walletTransaction.create).mockResolvedValue({} as never)
})

function makeRequest(impressionId: string, event = 'impression') {
  return new NextRequest(
    `http://localhost/api/creators/ads/track?impressionId=${impressionId}&event=${event}`,
  )
}

describe('GET /api/creators/ads/track', () => {
  it('returns 200 for impression event and confirms impression', async () => {
    const res = await GET(makeRequest('imp_1', 'impression'))
    expect(res.status).toBe(200)
    expect(db.adImpression.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'confirmed' }) }),
    )
  })

  it('calculates earnings: floor(cpmCents / 1000 * revenueSharePct / 100)', async () => {
    // floor(5000 / 1000 * 70 / 100) = floor(5 * 0.7) = floor(3.5) = 3 cents
    const imp = { ...freshImpression, campaign: { cpmCents: 5000 } }
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(imp as never)
    await GET(makeRequest('imp_1', 'impression'))
    expect(db.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 3 }),
      }),
    )
  })

  it('credits wallet with amountCents: 0 when floor rounds to zero (preserves ledger entry)', async () => {
    // floor(500 / 1000 * 70 / 100) = floor(0.5 * 0.7) = floor(0.35) = 0 cents
    // We always write the transaction record even at $0 — preserves the impression
    // audit trail and keeps ledger consistent. No guard on earningsCents > 0.
    const imp = { ...freshImpression, campaign: { cpmCents: 500 } }
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(imp as never)
    await GET(makeRequest('imp_1', 'impression'))
    expect(db.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 0 }),
      }),
    )
  })

  it('returns 404 for unknown impressionId', async () => {
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(null)
    const res = await GET(makeRequest('unknown'))
    expect(res.status).toBe(404)
  })

  it('returns 409 for already-confirmed impression', async () => {
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(
      { ...freshImpression, status: 'confirmed' } as never,
    )
    const res = await GET(makeRequest('imp_1'))
    expect(res.status).toBe(409)
  })

  it('returns 410 for impression older than 10 minutes', async () => {
    vi.mocked(db.adImpression.findUnique).mockResolvedValue({
      ...freshImpression,
      createdAt: new Date(now.getTime() - 11 * 60_000),
    } as never)
    const res = await GET(makeRequest('imp_1'))
    expect(res.status).toBe(410)
  })

  it('returns 200 for complete/skip events without crediting wallet', async () => {
    const res = await GET(makeRequest('imp_1', 'complete'))
    expect(res.status).toBe(200)
    expect(db.walletTransaction.create).not.toHaveBeenCalled()
  })
})
