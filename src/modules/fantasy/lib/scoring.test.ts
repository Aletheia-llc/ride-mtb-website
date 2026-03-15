import { describe, it, expect } from 'vitest'
import {
  getBasePoints,
  getBonusPoints,
  computeTeamTotal,
} from './scoring'

describe('getBasePoints', () => {
  it('returns 30 for 1st place', () => {
    expect(getBasePoints({ finishPosition: 1, dnsDnf: false, partialCompletion: false })).toBe(30)
  })
  it('returns 1 for 20th place', () => {
    expect(getBasePoints({ finishPosition: 20, dnsDnf: false, partialCompletion: false })).toBe(1)
  })
  it('returns 0 for 21st+', () => {
    expect(getBasePoints({ finishPosition: 21, dnsDnf: false, partialCompletion: false })).toBe(0)
  })
  it('returns -2 for DNS/DNF', () => {
    expect(getBasePoints({ finishPosition: null, dnsDnf: true, partialCompletion: false })).toBe(-2)
  })
  it('returns 0 for EWS partial completion (no penalty)', () => {
    expect(getBasePoints({ finishPosition: null, dnsDnf: false, partialCompletion: true })).toBe(0)
  })
})

describe('getBonusPoints', () => {
  it('adds +5 for fastest qualifier (DH/XC)', () => {
    const r = getBonusPoints({ isFastestQualifier: true, stageWins: 0, homePodium: false })
    expect(r).toBe(5)
  })
  it('adds +3 per EWS stage win', () => {
    expect(getBonusPoints({ isFastestQualifier: false, stageWins: 3, homePodium: false })).toBe(9)
  })
  it('adds +3 for home-country podium', () => {
    expect(getBonusPoints({ isFastestQualifier: false, stageWins: 0, homePodium: true })).toBe(3)
  })
  it('stacks bonuses', () => {
    expect(getBonusPoints({ isFastestQualifier: true, stageWins: 2, homePodium: true })).toBe(14)
  })
})

describe('computeTeamTotal', () => {
  it('adds wildcard top-10 bonus (+5 per qualifying wildcard)', () => {
    const picks = [
      { isWildcard: true, finishPosition: 5, dnsDnf: false, basePoints: 22, bonusPoints: 0 },
      { isWildcard: false, finishPosition: 3, dnsDnf: false, basePoints: 26, bonusPoints: 0 },
    ]
    const total = computeTeamTotal({ picks, salaryCap: 150000000, totalCost: 100000000 })
    expect(total.wildcardBonus).toBe(5)
  })
  it('adds perfect round bonus (+10) when all 6 finish top 20', () => {
    const picks = Array.from({ length: 6 }, (_, i) => ({
      isWildcard: false, finishPosition: i + 1, dnsDnf: false, basePoints: 30 - i * 2, bonusPoints: 0,
    }))
    const total = computeTeamTotal({ picks, salaryCap: 150000000, totalCost: 100000000 })
    expect(total.perfectRoundBonus).toBe(10)
  })
  it('returns 0 total when over budget', () => {
    const picks = [{ isWildcard: false, finishPosition: 1, dnsDnf: false, basePoints: 30, bonusPoints: 0 }]
    const total = computeTeamTotal({ picks, salaryCap: 150000000, totalCost: 160000000 })
    expect(total.totalPoints).toBe(0)
    expect(total.isOverBudget).toBe(true)
  })
})
