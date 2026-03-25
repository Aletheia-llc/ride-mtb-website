export type FacilityType = 'SKATEPARK' | 'PUMPTRACK' | 'BIKEPARK'
export type FacilityPhotoStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface FacilityPin {
  id: string
  osmId: string
  type: FacilityType
  name: string
  slug: string
  latitude: number
  longitude: number
  city: string | null
  state: string | null
  stateSlug: string | null
  surface: string | null
  lit: boolean | null
  avgRating: number | null
  reviewCount: number
}

export interface FacilityWithStats {
  id: string
  osmId: string
  type: FacilityType
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  state: string | null
  stateSlug: string | null
  operator: string | null
  openingHours: string | null
  surface: string | null
  website: string | null
  phone: string | null
  lit: boolean | null
  fee: boolean | null
  description: string | null
  lastSyncedAt: Date | null
  avgRating: number | null
  reviewCount: number
}

export interface StateStats {
  stateSlug: string
  stateName: string
  count: number
}

export interface OsmFacility {
  osmId: string
  type: FacilityType
  name: string
  slug: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  state: string | null
  stateSlug: string | null
  operator: string | null
  openingHours: string | null
  surface: string | null
  website: string | null
  phone: string | null
  lit: boolean | null
  fee: boolean | null
  metadata: Record<string, string>
}
