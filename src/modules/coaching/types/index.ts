// ── Coaching module types ────────────────────────────────────
// Aligned with query return shapes from lib/queries.ts

export interface ClinicSummary {
  id: string
  slug: string
  title: string
  startDate: Date
  endDate: Date | null
  location: string
  latitude: number | null
  longitude: number | null
  isFree: boolean
  costCents: number | null
  capacity: number | null
  status: string
  calcomLink: string | null
  coachId: string
  coachName: string | null
  coachImage: string | null
}

export interface ClinicDetail extends ClinicSummary {
  description: string | null
  coachTitle: string
  coachSpecialties: string[]
  coachCalcomLink: string | null
}

export interface CoachPin {
  id: string
  name: string | null
  latitude: number
  longitude: number
  specialties: string[]
  hourlyRate: number | null
  calcomLink: string | null
}

export interface ClinicPin {
  id: string
  slug: string
  title: string
  startDate: Date
  latitude: number
  longitude: number
  costCents: number | null
  isFree: boolean
  calcomLink: string | null
  coachName: string | null
}

export interface CoachSummary {
  id: string
  userId: string
  title: string
  specialties: string[]
  hourlyRate: number | null
  location: string | null
  isActive: boolean
  userName: string | null
  userImage: string | null
}

export interface CoachDetail {
  id: string
  userId: string
  title: string
  bio: string
  specialties: string[]
  hourlyRate: number | null
  location: string | null
  calcomLink: string | null
  certifications: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  userName: string | null
  userImage: string | null
}
