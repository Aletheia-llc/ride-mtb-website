// src/modules/bikes/lib/garage-queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    userBike: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'
import { getBikeStats, getBikesForCompare } from './garage-queries'

const mockBike = (overrides = {}) => ({
  id: 'bike-1',
  userId: 'user-1',
  name: 'Ripley',
  brand: 'Ibis',
  model: 'Ripley AF',
  year: 2022,
  category: 'trail',
  wheelSize: '29"',
  frameSize: 'L',
  weight: 27.5,
  purchasePrice: 3200,
  purchaseYear: 2022,
  frameMaterial: 'aluminum',
  travel: 120,
  imageUrl: null,
  isPrimary: true,
  notes: null,
  components: [
    { id: 'c-1', bikeId: 'bike-1', category: 'FORK', brand: 'Fox', model: '34', isActive: true, weightGrams: 2100, priceCents: 85000 },
    { id: 'c-2', bikeId: 'bike-1', category: 'DRIVETRAIN', brand: 'SRAM', model: 'GX', isActive: true, weightGrams: 1800, priceCents: 42000 },
    { id: 'c-3', bikeId: 'bike-1', category: 'WHEELS', brand: 'DT Swiss', model: 'M1900', isActive: false, weightGrams: 2500, priceCents: 60000 },
  ],
  ...overrides,
})

describe('getBikeStats', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns counts and totals for multiple bikes', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([
      mockBike({ id: 'bike-1', brand: 'Ibis', purchasePrice: 3200, components: [
        { id: 'c-1', category: 'FORK', brand: 'Fox', isActive: true, weightGrams: 2100, priceCents: 85000 },
      ]}),
      mockBike({ id: 'bike-2', brand: 'Trek', name: 'Slash', purchasePrice: 4000, components: [
        { id: 'c-2', category: 'FORK', brand: 'RockShox', isActive: true, weightGrams: 1900, priceCents: 70000 },
      ]}),
    ] as any)

    const stats = await getBikeStats('user-1')

    expect(stats.bikeCount).toBe(2)
    expect(stats.totalComponents).toBe(2)
    // totalInvestment = (3200 + 85000/100) + (4000 + 70000/100) = 3200+850 + 4000+700 = 8750
    expect(stats.totalInvestmentDollars).toBe(8750)
    expect(stats.brandCounts).toEqual({ Ibis: 1, Trek: 1 })
    expect(stats.categorySpending['FORK']).toBe(1550) // (85000 + 70000) / 100
  })

  it('only counts active components', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([mockBike()] as any)
    const stats = await getBikeStats('user-1')
    // bike has 2 active components (c-3 is inactive)
    expect(stats.totalComponents).toBe(2)
    expect(stats.bikeBreakdown[0].componentCount).toBe(2)
    // componentCost = (85000 + 42000) / 100 = 1270
    expect(stats.bikeBreakdown[0].componentCostDollars).toBe(1270)
    // weightGrams = 2100 + 1800 (not 2500 from inactive)
    expect(stats.bikeBreakdown[0].componentWeightGrams).toBe(3900)
  })

  it('returns empty stats when user has no bikes', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([])
    const stats = await getBikeStats('user-1')
    expect(stats.bikeCount).toBe(0)
    expect(stats.totalInvestmentDollars).toBe(0)
    expect(stats.bikeBreakdown).toHaveLength(0)
  })
})

describe('getBikesForCompare', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns bikes in the same order as bikeIds param', async () => {
    const b1 = mockBike({ id: 'bike-1', components: [] })
    const b2 = mockBike({ id: 'bike-2', name: 'Slash', components: [] })
    // DB returns in arbitrary order
    vi.mocked(db.userBike.findMany).mockResolvedValue([b2, b1] as any)

    const result = await getBikesForCompare(['bike-1', 'bike-2'], 'user-1')
    expect(result[0].id).toBe('bike-1')
    expect(result[1].id).toBe('bike-2')
  })

  it('excludes bikes not owned by userId', async () => {
    // DB WHERE clause filters by userId, so if not owned it won't be returned
    vi.mocked(db.userBike.findMany).mockResolvedValue([mockBike({ id: 'bike-1', components: [] })] as any)
    const result = await getBikesForCompare(['bike-1', 'bike-2'], 'user-1')
    // bike-2 was not returned by DB (not owned), so result only has 1
    expect(result).toHaveLength(1)
  })

  it('computes totalInvestmentDollars correctly', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([
      mockBike({ id: 'bike-1', purchasePrice: 3000, components: [
        { id: 'c-1', category: 'FORK', isActive: true, priceCents: 50000, weightGrams: 2000 },
      ]}),
    ] as any)
    const result = await getBikesForCompare(['bike-1'], 'user-1')
    expect(result[0].componentCostDollars).toBe(500) // 50000 / 100
    expect(result[0].totalInvestmentDollars).toBe(3500) // 3000 + 500
  })
})
