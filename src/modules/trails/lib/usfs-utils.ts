// Pure utility functions for USFS trail import.
// These are also duplicated inline in scripts/sync-usfs.mjs (which must stay standalone).
// Keep both in sync when modifying.

const EARTH_RADIUS_MILES = 3959
const METERS_TO_FEET = 3.28084
const ELEVATION_NOISE_FT = 3
const MIN_DISTANCE_MILES = 0.05

export type GpsPoint = [number, number, number] // [lat, lng, ele_meters]

export interface TrailStats {
  distance: number       // miles, rounded to 2 decimal places
  elevationGain: number  // feet, rounded
  elevationLoss: number  // feet, rounded
  highPoint: number      // feet, rounded
  lowPoint: number       // feet, rounded
  bounds: { neLat: number; neLng: number; swLat: number; swLng: number }
}

/** Lowercase, strip "National Forest", "NF", punctuation. "Pisgah National Forest" → "pisgah" */
export function normalizeSystemName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\bnational\s+forest\b/g, '')
    .replace(/\bnf\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "{MANAGING_ORG}#{TRAIL_NO}" — primary key for upsert deduplication */
export function buildExternalId(managingOrg: string, trailNo: string | number): string {
  const safeOrg = managingOrg.replace(/#/g, '-')
  return `${safeOrg}#${trailNo}`
}

/** GeoJSON [lng, lat, ele?] → [lat, lng, ele] (elevation defaults to 0) */
export function convertCoordinates(geojsonCoords: number[][]): GpsPoint[] {
  return geojsonCoords.map(([lng, lat, ele]) => [lat, lng, ele ?? 0])
}

/** Average of all [lat, lng, ele] points. Returns {0,0} for empty input. */
export function calculateCentroid(points: GpsPoint[]): { lat: number; lng: number } {
  if (!points.length) return { lat: 0, lng: 0 }
  return {
    lat: points.reduce((s, p) => s + p[0], 0) / points.length,
    lng: points.reduce((s, p) => s + p[1], 0) / points.length,
  }
}

/** Returns false if distance < 0.05 miles (bad/stub geometry). */
export function qualityCheck(distanceMiles: number): boolean {
  return distanceMiles >= MIN_DISTANCE_MILES
}

/** Haversine great-circle distance in miles. */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Compute trail statistics from GPS points (elevation input in meters, output in feet). */
export function calculateStats(points: GpsPoint[]): TrailStats {
  if (!points.length) {
    return { distance: 0, elevationGain: 0, elevationLoss: 0, highPoint: 0, lowPoint: 0,
             bounds: { neLat: 0, neLng: 0, swLat: 0, swLng: 0 } }
  }

  let distance = 0, elevationGain = 0, elevationLoss = 0
  const firstEleFt = points[0][2] * METERS_TO_FEET
  let highPoint = firstEleFt, lowPoint = firstEleFt
  let minLat = points[0][0], maxLat = points[0][0]
  let minLng = points[0][1], maxLng = points[0][1]

  for (let i = 1; i < points.length; i++) {
    const [lat1, lng1] = points[i - 1]
    const [lat2, lng2, ele2] = points[i]
    distance += haversineDistance(lat1, lng1, lat2, lng2)
    const ele1Ft = (points[i - 1][2] ?? 0) * METERS_TO_FEET
    const ele2Ft = (ele2 ?? 0) * METERS_TO_FEET
    const diff = ele2Ft - ele1Ft
    if (Math.abs(diff) >= ELEVATION_NOISE_FT) {
      if (diff > 0) elevationGain += diff
      else elevationLoss += Math.abs(diff)
    }
    if (ele2Ft > highPoint) highPoint = ele2Ft
    if (ele2Ft < lowPoint) lowPoint = ele2Ft
    if (lat2 < minLat) minLat = lat2
    if (lat2 > maxLat) maxLat = lat2
    if (lng2 < minLng) minLng = lng2
    if (lng2 > maxLng) maxLng = lng2
  }

  return {
    distance: Math.round(distance * 100) / 100,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    highPoint: Math.round(highPoint),
    lowPoint: Math.round(lowPoint),
    bounds: { neLat: maxLat, neLng: maxLng, swLat: minLat, swLng: minLng },
  }
}
