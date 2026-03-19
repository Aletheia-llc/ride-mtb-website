import { describe, it, expect } from 'vitest'
import { calculateTrustLevel } from '../trust'

describe('calculateTrustLevel', () => {
  // --- 'new' tier ---

  it("returns 'new' for a brand new seller (0 sales, null rating, not verified)", () => {
    expect(calculateTrustLevel(0, null, false)).toBe('new')
  })

  it("returns 'new' for 2 sales (below 3 threshold), even with a good rating", () => {
    expect(calculateTrustLevel(2, 4.5, true)).toBe('new')
  })

  it("returns 'new' for 3 sales with rating 3.9 (just below 4.0)", () => {
    expect(calculateTrustLevel(3, 3.9, true)).toBe('new')
  })

  // --- 'established' tier ---

  it("returns 'established' for exactly 3 sales and rating exactly 4.0", () => {
    expect(calculateTrustLevel(3, 4.0, false)).toBe('established')
  })

  it("returns 'established' for 9 sales and rating 4.4 (below trusted threshold)", () => {
    expect(calculateTrustLevel(9, 4.4, true)).toBe('established')
  })

  it("returns 'established' for 10 sales, rating 4.5, NOT verified (misses trusted because not verified)", () => {
    expect(calculateTrustLevel(10, 4.5, false)).toBe('established')
  })

  // --- 'trusted' tier ---

  it("returns 'trusted' for exactly 10 sales, rating exactly 4.5, isVerified true", () => {
    expect(calculateTrustLevel(10, 4.5, true)).toBe('trusted')
  })

  it("returns 'trusted' for 49 sales, rating 4.8, isVerified true (below power threshold)", () => {
    expect(calculateTrustLevel(49, 4.8, true)).toBe('trusted')
  })

  // --- 'power' tier ---

  it("returns 'power' for exactly 50 sales and rating exactly 4.7", () => {
    expect(calculateTrustLevel(50, 4.7, false)).toBe('power')
  })

  it("returns 'power' for 100 sales and rating 5.0", () => {
    expect(calculateTrustLevel(100, 5.0, true)).toBe('power')
  })

  // --- null rating handling ---

  it('treats null averageRating as 0 (new seller)', () => {
    expect(calculateTrustLevel(0, null, false)).toBe('new')
  })

  // --- boundary edge cases ---

  it("returns 'trusted' (not 'power') for 50 sales and rating 4.69 (just below power), when verified", () => {
    expect(calculateTrustLevel(50, 4.69, true)).toBe('trusted')
  })
})
