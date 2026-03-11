// ── Profile module shared types ─────────────────────────────
// Aligned with query return shapes from lib/queries.ts

import type { SkillLevel, UserRole, XpModule } from '@/generated/prisma/client'

export interface UserProfileData {
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
  skillLevel: SkillLevel | null
  favoriteBike: string | null
  favoriteTrail: string | null
  yearsRiding: number | null
  websiteUrl: string | null
  createdAt: Date
  lastActivityAt: Date | null
  bannedAt: Date | null
  xpAggregate: {
    totalXp: number
    moduleBreakdown: Record<string, number>
    streakDays: number
    lastGrantAt: Date | null
  } | null
  _count: {
    forumPosts: number
    trailReviews: number
    rideLogs: number
    gearReviews: number
  }
}

export interface ActivityItem {
  id: string
  type: string
  module: XpModule
  description: string
  points: number
  createdAt: Date
}

export interface ProfileUpdateInput {
  name?: string
  username?: string
  bio?: string
  location?: string
  ridingStyle?: string
  skillLevel?: SkillLevel | null
  favoriteBike?: string
  favoriteTrail?: string
  yearsRiding?: number | null
  websiteUrl?: string
}

// ── Utility ─────────────────────────────────────────────────

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(months / 12)
  return `${years}y ago`
}

export function formatXpEvent(event: string): string {
  const labels: Record<string, string> = {
    forum_post_created: 'Created a forum post',
    forum_thread_created: 'Started a forum thread',
    forum_vote_received: 'Received a vote',
    learn_quiz_completed: 'Completed a quiz',
    learn_quiz_improved: 'Improved a quiz score',
    learn_module_completed: 'Completed a lesson',
    learn_course_completed: 'Completed a course',
    trail_review_submitted: 'Submitted a trail review',
    trail_condition_reported: 'Reported trail conditions',
    trail_photo_uploaded: 'Uploaded a trail photo',
    trail_gpx_contributed: 'Contributed a GPX track',
    ride_logged: 'Logged a ride',
    review_submitted: 'Submitted a gear review',
    event_attended: 'Attended an event',
    streak_bonus: 'Streak bonus',
  }
  return labels[event] ?? event.replace(/_/g, ' ')
}

export function getSkillBadgeVariant(
  level: SkillLevel | null,
): 'default' | 'info' | 'warning' | 'success' {
  switch (level) {
    case 'beginner':
      return 'default'
    case 'intermediate':
      return 'info'
    case 'advanced':
      return 'warning'
    case 'expert':
      return 'success'
    default:
      return 'default'
  }
}

export function getRoleBadgeVariant(
  role: UserRole,
): 'default' | 'info' | 'warning' {
  switch (role) {
    case 'instructor':
      return 'info'
    case 'admin':
      return 'warning'
    default:
      return 'default'
  }
}
