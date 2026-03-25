// ── GPX Processing Pipeline ──────────────────────────────────
// Pure computation — no DB access, no 'server-only' needed.
// Used by both Next.js server code and CLI scripts.

import type { GpsPoint } from '../types'

// ── Types ────────────────────────────────────────────────────

export interface TrailStats {
  distance: number // total distance in miles
  elevationGain: number // cumulative gain in feet
  elevationLoss: number // cumulative loss in feet
  highPoint: number // max elevation in feet
  lowPoint: number // min elevation in feet
  bounds: {
    neLat: number
    neLng: number
    swLat: number
    swLng: number
  }
}

// ── Constants ────────────────────────────────────────────────

const EARTH_RADIUS_MILES = 3959
const METERS_TO_FEET = 3.28084
const ELEVATION_NOISE_THRESHOLD_FT = 3 // ignore changes smaller than this

// ── parseGpxToPoints ─────────────────────────────────────────

/**
 * Parse GPX XML content to an array of GPS points.
 * Uses regex (no DOMParser) for server-side compatibility.
 */
export function parseGpxToPoints(gpxContent: string): GpsPoint[] {
  const points: GpsPoint[] = []
  const trkptPattern =
    /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>[\s\S]*?<\/trkpt>/gi
  const elePattern = /<ele>([^<]+)<\/ele>/i

  let match: RegExpExecArray | null
  while ((match = trkptPattern.exec(gpxContent)) !== null) {
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    const body = match[0]

    let elevation = 0
    const eleMatch = elePattern.exec(body)
    if (eleMatch) {
      elevation = parseFloat(eleMatch[1])
    }

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      points.push([lat, lng, elevation])
    }
  }

  return points
}

// ── haversineDistance ─────────────────────────────────────────

/**
 * Haversine distance between two coordinates.
 * @returns distance in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_MILES * c
}

// ── calculateTrailStats ──────────────────────────────────────

/**
 * Compute trail statistics from GPS points.
 * Elevation values are converted from meters (input) to feet (output).
 * A minimum change threshold filters GPS noise in elevation data.
 */
export function calculateTrailStats(points: GpsPoint[]): TrailStats {
  if (points.length === 0) {
    return {
      distance: 0,
      elevationGain: 0,
      elevationLoss: 0,
      highPoint: 0,
      lowPoint: 0,
      bounds: { neLat: 0, neLng: 0, swLat: 0, swLng: 0 },
    }
  }

  let totalDistance = 0
  let elevationGain = 0
  let elevationLoss = 0

  // Track min/max elevation in feet
  const firstEleFt = points[0][2] * METERS_TO_FEET
  let highPoint = firstEleFt
  let lowPoint = firstEleFt

  // Track bounds
  let minLat = points[0][0]
  let maxLat = points[0][0]
  let minLng = points[0][1]
  let maxLng = points[0][1]

  for (let i = 1; i < points.length; i++) {
    const [lat1, lng1] = points[i - 1]
    const [lat2, lng2, ele2] = points[i]

    // Distance
    totalDistance += haversineDistance(lat1, lng1, lat2, lng2)

    // Elevation
    const ele1Ft = points[i - 1][2] * METERS_TO_FEET
    const ele2Ft = ele2 * METERS_TO_FEET
    const diff = ele2Ft - ele1Ft

    if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD_FT) {
      if (diff > 0) elevationGain += diff
      else elevationLoss += Math.abs(diff)
    }

    if (ele2Ft > highPoint) highPoint = ele2Ft
    if (ele2Ft < lowPoint) lowPoint = ele2Ft

    // Bounds
    if (lat2 < minLat) minLat = lat2
    if (lat2 > maxLat) maxLat = lat2
    if (lng2 < minLng) minLng = lng2
    if (lng2 > maxLng) maxLng = lng2
  }

  return {
    distance: Math.round(totalDistance * 100) / 100,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    highPoint: Math.round(highPoint),
    lowPoint: Math.round(lowPoint),
    bounds: {
      neLat: maxLat,
      neLng: maxLng,
      swLat: minLat,
      swLng: minLng,
    },
  }
}

// ── douglasPeucker ───────────────────────────────────────────

/**
 * Perpendicular distance from a point to the line between start and end.
 * Operates in degrees (appropriate for lat/lng at small scales).
 */
function perpendicularDistance(
  point: GpsPoint,
  lineStart: GpsPoint,
  lineEnd: GpsPoint,
): number {
  const [px, py] = point
  const [sx, sy] = lineStart
  const [ex, ey] = lineEnd

  const dx = ex - sx
  const dy = ey - sy

  // If start === end, return direct distance
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - sx) ** 2 + (py - sy) ** 2)
  }

  // Area of triangle * 2 / base length
  const numerator = Math.abs(dy * px - dx * py + ex * sy - ey * sx)
  const denominator = Math.sqrt(dx ** 2 + dy ** 2)

  return numerator / denominator
}

/**
 * Douglas-Peucker line simplification algorithm.
 * @param points - Input GPS points
 * @param tolerance - Tolerance in degrees (e.g., 0.00005 for ~5m)
 * @returns Simplified array of GPS points
 */
export function douglasPeucker(
  points: GpsPoint[],
  tolerance: number,
): GpsPoint[] {
  if (points.length <= 2) return points

  // Find the point with maximum distance from the line between first and last
  let maxDist = 0
  let maxIndex = 0

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1],
    )
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }

  // If max distance exceeds tolerance, recursively simplify both halves
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
    const right = douglasPeucker(points.slice(maxIndex), tolerance)

    // Combine, removing the duplicate point at the junction
    return [...left.slice(0, -1), ...right]
  }

  // All points within tolerance — keep only endpoints
  return [points[0], points[points.length - 1]]
}

// ── encodePolyline ───────────────────────────────────────────

/**
 * Encode GPS points to Google Encoded Polyline format.
 * Uses lat/lng (ignores elevation). Precision: 5 decimal places.
 */
export function encodePolyline(points: GpsPoint[]): string {
  let encoded = ''
  let prevLat = 0
  let prevLng = 0

  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5)
    const lngE5 = Math.round(lng * 1e5)

    encoded += encodeSignedValue(latE5 - prevLat)
    encoded += encodeSignedValue(lngE5 - prevLng)

    prevLat = latE5
    prevLng = lngE5
  }

  return encoded
}

function encodeSignedValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1
  let encoded = ''

  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
    v >>= 5
  }
  encoded += String.fromCharCode(v + 63)

  return encoded
}

// ── simplifyTrack ────────────────────────────────────────────

/**
 * Simplify a GPS track to at most `maxPoints` points.
 * Uses Douglas-Peucker with adaptive tolerance.
 * @param points - Input GPS points
 * @param maxPoints - Target maximum point count (default 500)
 * @returns Simplified GPS points
 */
export function simplifyTrack(
  points: GpsPoint[],
  maxPoints: number = 500,
): GpsPoint[] {
  if (points.length <= maxPoints) return points

  // Start with a small tolerance and double until under budget
  let tolerance = 0.00001
  let simplified = douglasPeucker(points, tolerance)

  // Cap iterations to prevent infinite loops
  let iterations = 0
  const maxIterations = 30

  while (simplified.length > maxPoints && iterations < maxIterations) {
    tolerance *= 2
    simplified = douglasPeucker(points, tolerance)
    iterations++
  }

  return simplified
}
