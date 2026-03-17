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
  coverImageUrl: string | null
  trailheadLat: number | null
  trailheadLng: number | null
  isFeatured: boolean
  reviewCount: number
  _count: { trails: number }
  photos?: Array<{ url: string }>
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
  hasGpsTrack: boolean
  features: string[]
  averageRating: number | null
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
    elevationProfile: string | null
    boundsJson: string | null
  } | null
  photos: Array<{ url: string; caption: string | null; isCover: boolean }>
  pois: Array<{
    id: string
    type: string
    name: string
    description: string | null
    lat: number
    lng: number
    photoUrl: string | null
  }>
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
  title: string | null
  body: string | null
  helpfulCount: number
  createdAt: Date
  user: { name: string | null; image: string | null }
}

/** Raw GPS point from DB: [latitude, longitude, elevation_meters] */
export type GpsPoint = [number, number, number]

export interface TrailMapPin {
  id: string
  name: string
  slug: string
  physicalDifficulty: number
  technicalDifficulty: number
  gpsTrack: { trackData: string | null } | null
}
