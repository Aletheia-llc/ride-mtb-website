import 'server-only'
import { db } from '@/lib/db/client'
import type { ProfileUpdateInput, UserProfileData, ActivityItem } from '../types'
import { formatXpEvent } from '../types'

// ── 1. getUserProfile ───────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      bio: true,
      role: true,
      location: true,
      ridingStyle: true,
      skillLevel: true,
      favoriteBike: true,
      favoriteTrail: true,
      yearsRiding: true,
      websiteUrl: true,
      createdAt: true,
      lastActivityAt: true,
      bannedAt: true,
      emailNotifications: true,
      xpAggregate: {
        select: {
          totalXp: true,
          moduleBreakdown: true,
          streakDays: true,
          lastGrantAt: true,
        },
      },
      _count: {
        select: {
          posts: true,
          trailReviews: true,
          rideLogs: true,
          gearReviews: true,
        },
      },
    },
  })

  if (!user) return null

  return {
    ...user,
    xpAggregate: user.xpAggregate
      ? {
          ...user.xpAggregate,
          moduleBreakdown: (user.xpAggregate.moduleBreakdown ?? {}) as Record<string, number>,
        }
      : null,
  }
}

// ── 2. getRecentActivity ────────────────────────────────────

export async function getRecentActivity(
  userId: string,
  limit: number = 20,
): Promise<ActivityItem[]> {
  const grants = await db.xpGrant.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      event: true,
      module: true,
      total: true,
      createdAt: true,
    },
  })

  return grants.map((grant) => ({
    id: grant.id,
    type: grant.event,
    module: grant.module,
    description: formatXpEvent(grant.event),
    points: grant.total,
    createdAt: grant.createdAt,
  }))
}

// ── 3. updateProfile ────────────────────────────────────────

export async function updateProfile(userId: string, input: ProfileUpdateInput) {
  return db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      username: input.username,
      bio: input.bio,
      location: input.location,
      ridingStyle: input.ridingStyle,
      skillLevel: input.skillLevel,
      favoriteBike: input.favoriteBike,
      favoriteTrail: input.favoriteTrail,
      yearsRiding: input.yearsRiding,
      websiteUrl: input.websiteUrl,
      emailNotifications: input.emailNotifications,
    },
    select: { id: true },
  })
}

// ── 4. getUserByUsername ─────────────────────────────────────

export async function getUserByUsername(username: string): Promise<UserProfileData | null> {
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      bio: true,
      role: true,
      location: true,
      ridingStyle: true,
      skillLevel: true,
      favoriteBike: true,
      favoriteTrail: true,
      yearsRiding: true,
      websiteUrl: true,
      createdAt: true,
      lastActivityAt: true,
      bannedAt: true,
      emailNotifications: true,
      xpAggregate: {
        select: {
          totalXp: true,
          moduleBreakdown: true,
          streakDays: true,
          lastGrantAt: true,
        },
      },
      _count: {
        select: {
          posts: true,
          trailReviews: true,
          rideLogs: true,
          gearReviews: true,
        },
      },
    },
  })

  if (!user) return null

  return {
    ...user,
    xpAggregate: user.xpAggregate
      ? {
          ...user.xpAggregate,
          moduleBreakdown: (user.xpAggregate.moduleBreakdown ?? {}) as Record<string, number>,
        }
      : null,
  }
}
