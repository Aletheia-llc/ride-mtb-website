export type EventType =
  | 'group_ride'
  | 'race'
  | 'skills_clinic'
  | 'trail_work'
  | 'social'
  | 'demo_day'
  | 'other'
  | 'race_xc'
  | 'race_enduro'
  | 'race_dh'
  | 'race_marathon'
  | 'race_other'
  | 'clinic'
  | 'camp'
  | 'expo'
  | 'bike_park_day'
  | 'virtual_challenge'

export type RsvpStatus = 'going' | 'maybe' | 'not_going'

export interface EventSummary {
  id: string
  title: string
  slug: string
  location: string
  startDate: Date
  endDate: Date | null
  eventType: EventType
  imageUrl: string | null
  creatorName: string | null
  rsvpCount: number
}

export interface EventRsvpData {
  id: string
  userId: string
  status: RsvpStatus
  createdAt: Date
  userName: string | null
  userImage: string | null
}

export interface EventDetailData {
  id: string
  creatorId: string
  title: string
  slug: string
  description: string | null
  location: string
  latitude: number | null
  longitude: number | null
  startDate: Date
  endDate: Date | null
  maxAttendees: number | null
  imageUrl: string | null
  eventType: EventType
  createdAt: Date
  creatorName: string | null
  creatorImage: string | null
  rsvps: EventRsvpData[]
  rsvpCount: number
  // New enriched fields
  shortDescription: string | null
  coverImageUrl: string | null
  difficulty: string | null
  isFree: boolean
  registrationUrl: string | null
  resultsPosted: boolean
  resultsUrl: string | null
  status: string
  // Organizer fields
  organizerId: string | null
  organizerName: string | null
  organizerVerified: boolean
}

export type EventStatusType = 'draft' | 'pending_review' | 'published' | 'cancelled' | 'postponed' | 'completed'

export interface EventMapPin {
  id: string
  slug: string
  title: string
  startDate: Date
  eventType: string
  latitude: number
  longitude: number
  rsvpCount: number
}

export interface EventSearchResult {
  id: string
  slug: string
  title: string
  startDate: Date
  eventType: string
  status: string
  city: string | null
  state: string | null
  coverImageUrl: string | null
  isFree: boolean
  rsvpCount: number
}

export interface SearchEventsParams {
  query?: string
  eventType?: string
  startDate?: Date
  endDate?: Date
  isFree?: boolean
  cursor?: string
  limit?: number
}

export interface NearMeParams {
  latitude: number
  longitude: number
  radiusKm: number
  limit?: number
}

export interface UserEventPreferenceData {
  homeLatitude?: number | null
  homeLongitude?: number | null
  searchRadius: number
  followedTypes: string[]
  newEventAlerts: boolean
  reminderDays: number
  resultsAlerts: boolean
}
