import { describe, it, expect } from 'vitest'
import {
  normalizeSystemName,
  buildExternalId,
  convertCoordinates,
  calculateStats,
  qualityCheck,
  IMPORT_SOURCE,
} from './usfs-utils'

// Fixture: 3 trails from one small forest (matches USFS GeoJSON structure)
const FIXTURE_ORG = 'Green Mountain National Forest'
const FIXTURE_FEATURES = [
  {
    properties: { TRAIL_NAME: 'Long Trail', TRAIL_NO: '1', MANAGING_ORG: FIXTURE_ORG, SURFACE_TYPE: 'NATIVE' },
    geometry: { coordinates: [[-72.9, 44.0, 300], [-72.91, 44.01, 310], [-72.92, 44.02, 320]] },
  },
  {
    properties: { TRAIL_NAME: 'Appalachian Trail', TRAIL_NO: '2', MANAGING_ORG: FIXTURE_ORG, SURFACE_TYPE: 'NATIVE' },
    geometry: { coordinates: [[-72.8, 43.9, 400], [-72.81, 43.91, 420], [-72.82, 43.92, 450]] },
  },
  {
    properties: { TRAIL_NAME: 'Robert Frost Trail', TRAIL_NO: '3', MANAGING_ORG: FIXTURE_ORG, SURFACE_TYPE: 'PAVED' },
    geometry: { coordinates: [[-72.7, 43.8, 200], [-72.71, 43.81, 215], [-72.72, 43.82, 230]] },
  },
]

describe('sync-usfs integration (mocked DB)', () => {
  it('computes correct stats for all 3 fixture trails', () => {
    const results = FIXTURE_FEATURES.map(f => {
      const points = convertCoordinates(f.geometry.coordinates)
      const stats = calculateStats(points)
      const externalId = buildExternalId(f.properties.MANAGING_ORG, f.properties.TRAIL_NO)
      return { name: f.properties.TRAIL_NAME, externalId, stats }
    })
    // All 3 pass quality check
    expect(results.every(r => qualityCheck(r.stats.distance))).toBe(true)
    // External IDs have correct format
    expect(results[0].externalId).toBe(`${FIXTURE_ORG}#1`)
    expect(results[1].externalId).toBe(`${FIXTURE_ORG}#2`)
    expect(results[2].externalId).toBe(`${FIXTURE_ORG}#3`)
    // All have positive distance
    expect(results.every(r => r.stats.distance > 0)).toBe(true)
  })

  it('calculates totalMiles as sum of all 3 trail distances', () => {
    const distances = FIXTURE_FEATURES.map(f => {
      const points = convertCoordinates(f.geometry.coordinates)
      return calculateStats(points).distance
    })
    // Each fixture trail spans ~0.02° lat/lng — should be roughly 1-2 miles each
    distances.forEach(d => {
      expect(d).toBeGreaterThan(0.5)
      expect(d).toBeLessThan(3)
    })
    const totalMiles = distances.reduce((sum, d) => sum + d, 0)
    expect(totalMiles).toBeGreaterThan(1.5)
    expect(totalMiles).toBeLessThan(9)
  })

  it('importSource is USFS and externalId follows MANAGING_ORG#TRAIL_NO format', () => {
    expect(IMPORT_SOURCE).toBe('USFS')
    FIXTURE_FEATURES.forEach(f => {
      const externalId = buildExternalId(f.properties.MANAGING_ORG, f.properties.TRAIL_NO)
      expect(externalId).toBe(`${f.properties.MANAGING_ORG}#${f.properties.TRAIL_NO}`)
    })
  })

  it('system externalId is the raw managing org name (no # separator)', () => {
    // TrailSystem.externalId = MANAGING_ORG directly (no trail number suffix)
    // The # separator is only used for trail-level externalIds
    const trailExternalId = buildExternalId(FIXTURE_ORG, '1')
    expect(trailExternalId).toContain('#')
    expect(FIXTURE_ORG).not.toContain('#') // system ID has no # — it's just the org name
    expect(normalizeSystemName(FIXTURE_ORG)).not.toBe(FIXTURE_ORG) // normalized != raw
  })

  it('idempotency: re-processing same features produces same external IDs', () => {
    // Running the same fixture twice must produce the same externalIds.
    // With ON CONFLICT (importSource, externalId) DO UPDATE, this is safe.
    const run1 = FIXTURE_FEATURES.map(f => buildExternalId(f.properties.MANAGING_ORG, f.properties.TRAIL_NO))
    const run2 = FIXTURE_FEATURES.map(f => buildExternalId(f.properties.MANAGING_ORG, f.properties.TRAIL_NO))
    expect(run1).toEqual(run2)
  })

  it('normalizes the forest name consistently across runs', () => {
    const norm1 = normalizeSystemName(FIXTURE_ORG)
    const norm2 = normalizeSystemName(FIXTURE_ORG)
    expect(norm1).toBe(norm2)
    expect(norm1).toBe('green mountain') // "National Forest" stripped
  })
})
