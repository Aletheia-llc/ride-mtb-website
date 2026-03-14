import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitShopReview } from './submitShopReview'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }) }))
vi.mock('@/lib/db/client', () => ({
  db: {
    shopReview: {
      findFirst: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({
        _avg: { overallRating: 4.5, serviceRating: 4, pricingRating: 4, selectionRating: 5 },
        _count: { id: 1 },
      }),
    },
    shop: { update: vi.fn() },
  },
}))

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

describe('submitShopReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(db.shopReview.aggregate).mockResolvedValue({
      _avg: { overallRating: 4.5, serviceRating: 4, pricingRating: 4, selectionRating: 5 },
      _count: { id: 1 },
      _sum: {},
      _min: {},
      _max: {},
    } as never)
    vi.mocked(db.shop.update).mockResolvedValue({} as never)
  })

  it('creates a review successfully', async () => {
    vi.mocked(db.shopReview.findFirst).mockResolvedValue(null)
    vi.mocked(db.shopReview.create).mockResolvedValue({} as never)
    const formData = new FormData()
    formData.append('shopId', 'shop-1')
    formData.append('overallRating', '5')
    formData.append('serviceRating', '5')
    formData.append('pricingRating', '4')
    formData.append('selectionRating', '5')
    formData.append('body', 'Great shop, highly recommend it!')
    const result = await submitShopReview({ errors: {} }, formData)
    expect(result.success).toBe(true)
    expect(db.shopReview.create).toHaveBeenCalled()
  })

  it('rejects duplicate review', async () => {
    vi.mocked(db.shopReview.findFirst).mockResolvedValue({ id: 'existing' } as never)
    const formData = new FormData()
    formData.append('shopId', 'shop-1')
    formData.append('overallRating', '5')
    formData.append('serviceRating', '5')
    formData.append('pricingRating', '4')
    formData.append('selectionRating', '5')
    formData.append('body', 'Great shop, highly recommend it!')
    const result = await submitShopReview({ errors: {} }, formData)
    expect(result.errors.general).toContain('already reviewed')
  })

  it('validates minimum body length', async () => {
    vi.mocked(db.shopReview.findFirst).mockResolvedValue(null)
    const formData = new FormData()
    formData.append('shopId', 'shop-1')
    formData.append('overallRating', '5')
    formData.append('serviceRating', '5')
    formData.append('pricingRating', '4')
    formData.append('selectionRating', '5')
    formData.append('body', 'Short')
    const result = await submitShopReview({ errors: {} }, formData)
    expect(result.errors.general).toBeTruthy()
    expect(result.success).toBeUndefined()
  })
})
