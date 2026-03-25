import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWeeklyXp } from './queries'

vi.mock('@/lib/db/client', () => ({
  db: {
    xpGrant: {
      aggregate: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'

describe('getWeeklyXp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns sum of XpGrant.total for the current week', async () => {
    vi.mocked(db.xpGrant.aggregate).mockResolvedValueOnce({
      _sum: { total: 150 },
    } as never)

    const result = await getWeeklyXp('user-1')
    expect(result).toBe(150)
    expect(db.xpGrant.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
        _sum: { total: true },
      }),
    )
  })

  it('returns 0 when user has no grants this week', async () => {
    vi.mocked(db.xpGrant.aggregate).mockResolvedValueOnce({
      _sum: { total: null },
    } as never)

    const result = await getWeeklyXp('user-2')
    expect(result).toBe(0)
  })
})
