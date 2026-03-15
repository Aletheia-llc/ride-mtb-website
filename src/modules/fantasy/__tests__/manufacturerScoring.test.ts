import { describe, it, expect } from 'vitest'
import { MANUFACTURER_POSITION_POINTS } from '../constants/scoring'

describe('MANUFACTURER_POSITION_POINTS', () => {
  it('1st place = 15', () => expect(MANUFACTURER_POSITION_POINTS[1]).toBe(15))
  it('2nd place = 14', () => expect(MANUFACTURER_POSITION_POINTS[2]).toBe(14))
  it('12th place = 5 (rounds up from 4.5)', () => expect(MANUFACTURER_POSITION_POINTS[12]).toBe(5))
  it('14th place = 4 (rounds up from 3.5)', () => expect(MANUFACTURER_POSITION_POINTS[14]).toBe(4))
  it('20th place = 1 (rounds up from 0.5)', () => expect(MANUFACTURER_POSITION_POINTS[20]).toBe(1))
  it('returns undefined for 21st+ (caller treats as 0)', () => expect(MANUFACTURER_POSITION_POINTS[21]).toBeUndefined())
})

describe('manufacturer top-finisher selection', () => {
  // Pure function extracted for testability
  function getTopBrandFinisher(
    entries: Array<{ riderId: string; finishPosition: number | null; dnsDnf: boolean; partialCompletion: boolean; manufacturerId: string | null }>,
    manufacturerId: string
  ): { riderId: string; finishPosition: number } | null {
    const eligible = entries.filter(
      e => e.manufacturerId === manufacturerId && !e.dnsDnf && !e.partialCompletion && e.finishPosition !== null
    ) as Array<{ riderId: string; finishPosition: number; manufacturerId: string; dnsDnf: boolean; partialCompletion: boolean }>
    if (eligible.length === 0) return null
    eligible.sort((a, b) => a.finishPosition - b.finishPosition)
    return { riderId: eligible[0].riderId, finishPosition: eligible[0].finishPosition }
  }

  it('picks lowest finishPosition', () => {
    const entries = [
      { riderId: 'r1', finishPosition: 3, dnsDnf: false, partialCompletion: false, manufacturerId: 'mfr_1' },
      { riderId: 'r2', finishPosition: 1, dnsDnf: false, partialCompletion: false, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toEqual({ riderId: 'r2', finishPosition: 1 })
  })

  it('excludes DNS/DNF riders', () => {
    const entries = [
      { riderId: 'r1', finishPosition: null, dnsDnf: true, partialCompletion: false, manufacturerId: 'mfr_1' },
      { riderId: 'r2', finishPosition: 5, dnsDnf: false, partialCompletion: false, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toEqual({ riderId: 'r2', finishPosition: 5 })
  })

  it('excludes EWS partial completion riders', () => {
    const entries = [
      { riderId: 'r1', finishPosition: null, dnsDnf: false, partialCompletion: true, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toBeNull()
  })

  it('returns null when all brand riders DNS/DNF', () => {
    const entries = [
      { riderId: 'r1', finishPosition: null, dnsDnf: true, partialCompletion: false, manufacturerId: 'mfr_1' },
    ]
    expect(getTopBrandFinisher(entries, 'mfr_1')).toBeNull()
  })

  it('returns null when no riders for brand in event', () => {
    expect(getTopBrandFinisher([], 'mfr_1')).toBeNull()
  })
})
