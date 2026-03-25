// ── Admin module shared types ───────────────────────────────
// Aligned with query return shapes from lib/queries.ts

import type { UserRole } from '@/generated/prisma/client'

export interface AdminStats {
  totalUsers: number
  totalPosts: number
  totalTrails: number
  totalEvents: number
  totalReviews: number
  totalListings: number
}

export interface UserAdminView {
  id: string
  email: string
  name: string | null
  username: string | null
  image: string | null
  role: UserRole
  bannedAt: Date | null
  createdAt: Date
  totalXp: number
}
