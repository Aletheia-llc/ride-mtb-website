import { describe, it, expect } from 'vitest'
import {
  normalizeSystemName,
  convertCoordinates,
  calculateCentroid,
  qualityCheck,
  buildExternalId,
  haversineDistance,
  calculateStats,
} from './usfs-utils'

describe('normalizeSystemName', () => {
  it('strips "National Forest" suffix', () => {
    expect(normalizeSystemName('Pisgah National Forest')).toBe('pisgah')
  })
  it('strips "NF" abbreviation', () => {
    expect(normalizeSystemName('Chattahoochee-Oconee NF')).toBe('chattahoochee oconee')
  })
  it('handles empty string', () => {
    expect(normalizeSystemName('')).toBe('')
  })
  it('handles null', () => {
    expect(normalizeSystemName(null)).toBe('')
  })
})

describe('convertCoordinates', () => {
  it('swaps [lng, lat, ele] to [lat, lng, ele]', () => {
    expect(convertCoordinates([[-82.5, 35.3, 1200]])).toEqual([[35.3, -82.5, 1200]])
  })
  it('defaults missing elevation to 0', () => {
    expect(convertCoordinates([[-82.5, 35.3]])).toEqual([[35.3, -82.5, 0]])
  })
  it('handles multiple points', () => {
    const result = convertCoordinates([[-82.5, 35.3, 100], [-82.6, 35.4, 200]])
    expect(result).toEqual([[35.3, -82.5, 100], [35.4, -82.6, 200]])
  })
})

describe('calculateCentroid', () => {
  it('returns average lat/lng for two points', () => {
    expect(calculateCentroid([[35.0, -82.0, 0], [37.0, -84.0, 0]])).toEqual({ lat: 36, lng: -83 })
  })
  it('handles a single point', () => {
    expect(calculateCentroid([[35.5, -82.5, 0]])).toEqual({ lat: 35.5, lng: -82.5 })
  })
  it('returns zeros for empty array', () => {
    expect(calculateCentroid([])).toEqual({ lat: 0, lng: 0 })
  })
})

describe('qualityCheck', () => {
  it('returns false for 0 miles', () => {
    expect(qualityCheck(0)).toBe(false)
  })
  it('returns false for below threshold (0.04)', () => {
    expect(qualityCheck(0.04)).toBe(false)
  })
  it('returns true at threshold (0.05)', () => {
    expect(qualityCheck(0.05)).toBe(true)
  })
  it('returns true for normal trail distance', () => {
    expect(qualityCheck(2.5)).toBe(true)
  })
})

describe('buildExternalId', () => {
  it('formats as "Forest#TrailNo"', () => {
    expect(buildExternalId('Pisgah National Forest', '2108')).toBe('Pisgah National Forest#2108')
  })
})

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(35.5, -82.5, 35.5, -82.5)).toBe(0)
  })
  it('returns approximately correct distance (NYC to LA ≈ 2446 mi)', () => {
    const dist = haversineDistance(40.71, -74.01, 34.05, -118.24)
    expect(dist).toBeGreaterThan(2400)
    expect(dist).toBeLessThan(2500)
  })
})

describe('calculateStats', () => {
  it('returns zeros for empty points', () => {
    const s = calculateStats([])
    expect(s.distance).toBe(0)
    expect(s.elevationGain).toBe(0)
  })
  it('calculates distance for two points ~1 mile apart', () => {
    // 0.01454° lat ≈ 1 mile
    const points: [number, number, number][] = [[35.5, -82.5, 0], [35.5144, -82.5, 0]]
    const s = calculateStats(points)
    expect(s.distance).toBeGreaterThan(0.9)
    expect(s.distance).toBeLessThan(1.1)
  })
  it('calculates elevation gain from meters', () => {
    // 100m up = 328ft; below noise threshold of 3ft so only large gains register
    const points: [number, number, number][] = [
      [35.5, -82.5, 0],
      [35.5144, -82.5, 100], // 100m = 328ft gain
    ]
    const s = calculateStats(points)
    expect(s.elevationGain).toBeGreaterThan(300)
  })
  it('computes correct bounds', () => {
    const points: [number, number, number][] = [[35.5, -82.5, 0], [36.0, -83.0, 0]]
    const s = calculateStats(points)
    expect(s.bounds.neLat).toBe(36.0)
    expect(s.bounds.swLat).toBe(35.5)
    expect(s.bounds.neLng).toBe(-82.5)
    expect(s.bounds.swLng).toBe(-83.0)
  })
})
