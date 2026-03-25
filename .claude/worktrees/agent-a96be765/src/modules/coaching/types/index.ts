// ── Coaching module types ────────────────────────────────────
// Aligned with query return shapes from lib/queries.ts

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
