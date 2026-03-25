export type LayerName = 'trails' | 'events' | 'coaching' | 'skateparks' | 'pumptracks' | 'bikeparks'

export interface TrailSystemPin {
  id: string
  slug: string
  name: string
  city: string
  state: string
  latitude: number
  longitude: number
  trailCount: number
  averageRating?: number | null
}

export interface EventPin {
  id: string
  slug: string
  title: string
  startDate: string
  eventType: string
  latitude: number
  longitude: number
  rsvpCount: number
}

export interface CoachPin {
  id: string
  name: string
  latitude: number
  longitude: number
  specialties: string[]
  hourlyRate?: number | null
  calcomLink?: string | null
}

export interface ClinicPin {
  id: string
  slug: string
  title: string
  startDate: string
  latitude: number
  longitude: number
  costCents?: number | null
  isFree: boolean
  calcomLink?: string | null
  coachName: string
}

export interface CoachingMapData {
  coaches: CoachPin[]
  clinics: ClinicPin[]
}
