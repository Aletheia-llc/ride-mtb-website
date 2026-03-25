export type EventType =
  | 'group_ride'
  | 'race'
  | 'skills_clinic'
  | 'trail_work'
  | 'social'
  | 'demo_day'
  | 'other'

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
}
