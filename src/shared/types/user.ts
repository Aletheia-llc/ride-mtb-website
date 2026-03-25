export type UserRole = 'user' | 'instructor' | 'admin'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  username: string | null
  image: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  location: string | null
  ridingStyle: string | null
  skillLevel: string | null
  favoriteBike: string | null
  favoriteTrail: string | null
  yearStartedRiding: number | null
  websiteUrl: string | null
  createdAt: Date
}
