// ── Trail module types ────────────────────────────────────────
// Aligned with query return shapes from lib/queries.ts

export interface TrailSystemSummary {
  id: string
  name: string
  slug: string
  description: string | null
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  systemType: string
  status: string
  totalMiles: number
  trailCount: number
  _count: { trails: number }
}

export interface TrailSummary {
  id: string
  name: string
  slug: string
  trailType: string
  physicalDifficulty: number
  technicalDifficulty: number
  distance: number | null
  elevationGain: number | null
  status: string
  condition: string | null
  system: { name: string; slug: string }
  gpsTrack: { id: string } | null
  _count: { reviews: number }
}

export interface TrailDetail {
  id: string
  name: string
  slug: string
  description: string | null
  trailType: string
  physicalDifficulty: number
  technicalDifficulty: number
  distance: number | null
  elevationGain: number | null
  elevationLoss: number | null
  highPoint: number | null
  lowPoint: number | null
  status: string
  condition: string | null
  system: {
    name: string
    slug: string
    city: string | null
    state: string | null
  }
  gpsTrack: {
    id: string
    trackData: string | null
    boundsNeLat: number | null
    boundsNeLng: number | null
    boundsSwLat: number | null
    boundsSwLng: number | null
    pointCount: number
  } | null
  reviews: TrailReviewData[]
  _count: { reviews: number; favorites: number }
}

export interface TrailReviewData {
  id: string
  rating: number
  flowRating: number | null
  sceneryRating: number | null
  technicalRating: number | null
  maintenanceRating: number | null
  comment: string | null
  rideDate: Date | null
  bikeType: string | null
  createdAt: Date
  user: { name: string | null; image: string | null }
}

/** Raw GPS point from DB: [latitude, longitude, elevation_meters] */
export type GpsPoint = [number, number, number]
