import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user_1' } }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    fantasyEvent: {
      findFirst: vi.fn(),
    },
    manufacturerPick: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  pool: {
    query: vi.fn(),
  },
}))

import { db } from '@/lib/db/client'

describe('pickManufacturer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error if pick window is closed (Round 1 locked)', async () => {
    vi.mocked(db.fantasyEvent.findFirst).mockResolvedValue({
      rosterDeadline: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    } as any)
    vi.mocked(db.manufacturerPick.findUnique).mockResolvedValue(null)

    const { pickManufacturer } = await import('../actions/pickManufacturer')
    const fd = new FormData()
    fd.set('seriesId', 'series_1')
    fd.set('season', '2026')
    fd.set('manufacturerId', 'mfr_1')
    const result = await pickManufacturer({ error: undefined }, fd)
    expect(result.error).toMatch(/closed/i)
  })

  it('upserts pick when window is open', async () => {
    vi.mocked(db.fantasyEvent.findFirst).mockResolvedValue({
      rosterDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h from now
    } as any)
    vi.mocked(db.manufacturerPick.upsert).mockResolvedValue({} as any)
    vi.mocked(db.manufacturerPick.findUnique).mockResolvedValue(null)

    const { pickManufacturer } = await import('../actions/pickManufacturer')
    const fd = new FormData()
    fd.set('seriesId', 'series_1')
    fd.set('season', '2026')
    fd.set('manufacturerId', 'mfr_1')
    const result = await pickManufacturer({ error: undefined }, fd)
    expect(result.error).toBeUndefined()
    expect(db.manufacturerPick.upsert).toHaveBeenCalled()
  })

  it('returns error if already locked', async () => {
    vi.mocked(db.fantasyEvent.findFirst).mockResolvedValue({
      rosterDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24),
    } as any)
    vi.mocked(db.manufacturerPick.findUnique).mockResolvedValue({
      lockedAt: new Date(Date.now() - 1000),
    } as any)

    const { pickManufacturer } = await import('../actions/pickManufacturer')
    const fd = new FormData()
    fd.set('seriesId', 'series_1')
    fd.set('season', '2026')
    fd.set('manufacturerId', 'mfr_1')
    const result = await pickManufacturer({ error: undefined }, fd)
    expect(result.error).toMatch(/locked/i)
  })
})
