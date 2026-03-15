import { describe, it, expect } from 'vitest'
import { computeMarketPrice } from './pricing'

const BASE = 30_000_000 // $300K

describe('computeMarketPrice', () => {
  it('returns base price at 0% ownership', () => {
    expect(computeMarketPrice({ basePriceCents: BASE, teamCount: 500, teamsWithRider: 0, sensitivityFactor: 1.5 }))
      .toBe(BASE)
  })

  it('applies formula: 40% ownership at 1.5 sensitivity = 1.6x', () => {
    // multiplier = 1 + 0.4 * 1.5 = 1.6; 300K * 1.6 = 480K
    expect(computeMarketPrice({ basePriceCents: BASE, teamCount: 500, teamsWithRider: 200, sensitivityFactor: 1.5 }))
      .toBe(48_000_000)
  })

  it('clamps at floor (50% of base) when ownership is 0 and teams are 0', () => {
    const price = computeMarketPrice({ basePriceCents: BASE, teamCount: 0, teamsWithRider: 0, sensitivityFactor: 1.5 })
    expect(price).toBeGreaterThanOrEqual(BASE * 0.5)
  })

  it('clamps at ceiling (300% of base) when ownership is 100%', () => {
    const result = computeMarketPrice({ basePriceCents: BASE, teamCount: 100, teamsWithRider: 100, sensitivityFactor: 3.0 })
    expect(result).toBeLessThanOrEqual(BASE * 3)
  })

  it('uses effective team count of 100 when actual < 100 (dampening)', () => {
    // 10 teams with rider, effective denominator = 100. ownership = 0.1. multiplier = 1 + 0.1 * 1.5 = 1.15
    // 300K * 1.15 = 345K
    expect(computeMarketPrice({ basePriceCents: BASE, teamCount: 50, teamsWithRider: 10, sensitivityFactor: 1.5 }))
      .toBe(34_500_000)
  })
})
