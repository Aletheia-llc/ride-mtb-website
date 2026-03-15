import 'server-only'
import { db } from '@/lib/db/client'
import type { CoachSummary, CoachDetail } from '../types'

// ── Types ─────────────────────────────────────────────────────

export interface CoachFilters {
  specialty?: string
  location?: string
}

// ── Helpers ───────────────────────────────────────────────────

function toCoachSummary(
  profile: {
    id: string
    userId: string
    title: string
    specialties: unknown
    hourlyRate: number | null
    location: string | null
    isActive: boolean
    user: { name: string | null; image: string | null }
  },
): CoachSummary {
  return {
    id: profile.id,
    userId: profile.userId,
    title: profile.title,
    specialties: (profile.specialties as string[]) ?? [],
    hourlyRate: profile.hourlyRate,
    location: profile.location,
    isActive: profile.isActive,
    userName: profile.user.name,
    userImage: profile.user.image,
  }
}

function toCoachDetail(
  profile: {
    id: string
    userId: string
    title: string
    bio: string
    specialties: unknown
    hourlyRate: number | null
    location: string | null
    calcomLink: string | null
    certifications: unknown
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    user: { name: string | null; image: string | null }
  },
): CoachDetail {
  return {
    id: profile.id,
    userId: profile.userId,
    title: profile.title,
    bio: profile.bio,
    specialties: (profile.specialties as string[]) ?? [],
    hourlyRate: profile.hourlyRate,
    location: profile.location,
    calcomLink: profile.calcomLink,
    certifications: (profile.certifications as string[]) ?? [],
    isActive: profile.isActive,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    userName: profile.user.name,
    userImage: profile.user.image,
  }
}

// ── 1. getCoaches ─────────────────────────────────────────────

export async function getCoaches(
  filters?: CoachFilters,
): Promise<CoachSummary[]> {
  const profiles = await db.coachProfile.findMany({
    where: {
      isActive: true,
      ...(filters?.specialty && {
        specialties: {
          array_contains: [filters.specialty],
        },
      }),
      ...(filters?.location && {
        location: { contains: filters.location, mode: 'insensitive' as const },
      }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  })

  return profiles.map(toCoachSummary)
}

// ── 2. getCoachById ───────────────────────────────────────────

export async function getCoachById(
  id: string,
): Promise<CoachDetail | null> {
  const profile = await db.coachProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  })

  if (!profile) return null
  return toCoachDetail(profile)
}

// ── 3. getCoachByUserId ───────────────────────────────────────

export async function getCoachByUserId(
  userId: string,
): Promise<CoachDetail | null> {
  const profile = await db.coachProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  })

  if (!profile) return null
  return toCoachDetail(profile)
}

// ── 4. getCoachApplications ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCoachApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<any[]> {
  return db.coachApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true, image: true } } },
  })
}

// ── 5. getMyCoachApplication ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMyCoachApplication(userId: string): Promise<any | null> {
  return db.coachApplication.findUnique({
    where: { userId },
  })
}
