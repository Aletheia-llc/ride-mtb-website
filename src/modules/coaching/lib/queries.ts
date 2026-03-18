import 'server-only'
import { cache } from 'react'
import { db } from '@/lib/db/client'
import type { CoachSummary, CoachDetail, ClinicSummary, ClinicDetail, CoachPin, ClinicPin } from '../types'

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

// ── Clinic helpers ────────────────────────────────────────────

function toClinicSummary(
  clinic: {
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
    coach: {
      user: { name: string | null; image: string | null }
    }
  },
): ClinicSummary {
  return {
    id: clinic.id,
    slug: clinic.slug,
    title: clinic.title,
    startDate: clinic.startDate,
    endDate: clinic.endDate,
    location: clinic.location,
    latitude: clinic.latitude,
    longitude: clinic.longitude,
    isFree: clinic.isFree,
    costCents: clinic.costCents,
    capacity: clinic.capacity,
    status: clinic.status,
    calcomLink: clinic.calcomLink,
    coachId: clinic.coachId,
    coachName: clinic.coach.user.name,
    coachImage: clinic.coach.user.image,
  }
}

// ── 6. getUpcomingClinics ─────────────────────────────────────

export async function getUpcomingClinics(
  filters?: { specialty?: string; location?: string },
): Promise<ClinicSummary[]> {
  const clinics = await db.coachingClinic.findMany({
    where: {
      status: 'published',
      startDate: { gte: new Date() },
      ...(filters?.location && {
        location: { contains: filters.location, mode: 'insensitive' as const },
      }),
    },
    orderBy: { startDate: 'asc' },
    include: {
      coach: {
        select: {
          specialties: true,
          user: { select: { name: true, image: true } },
        },
      },
    },
  })

  const filtered = filters?.specialty
    ? clinics.filter((c) =>
        ((c.coach.specialties as string[]) ?? []).includes(filters.specialty!),
      )
    : clinics

  return filtered.map(toClinicSummary)
}

// ── 7. getClinicBySlug ────────────────────────────────────────

export const getClinicBySlug = cache(async (slug: string): Promise<ClinicDetail | null> => {
  const clinic = await db.coachingClinic.findUnique({
    where: { slug },
    include: {
      coach: {
        select: {
          title: true,
          specialties: true,
          calcomLink: true,
          user: { select: { name: true, image: true } },
        },
      },
    },
  })

  if (!clinic) return null

  return {
    id: clinic.id,
    slug: clinic.slug,
    title: clinic.title,
    description: clinic.description,
    startDate: clinic.startDate,
    endDate: clinic.endDate,
    location: clinic.location,
    latitude: clinic.latitude,
    longitude: clinic.longitude,
    isFree: clinic.isFree,
    costCents: clinic.costCents,
    capacity: clinic.capacity,
    status: clinic.status,
    calcomLink: clinic.calcomLink,
    coachId: clinic.coachId,
    coachName: clinic.coach.user.name,
    coachImage: clinic.coach.user.image,
    coachTitle: clinic.coach.title,
    coachSpecialties: (clinic.coach.specialties as string[]) ?? [],
    coachCalcomLink: clinic.coach.calcomLink,
  }
})

// ── 8. getMyClinics ───────────────────────────────────────────

export async function getMyClinics(coachId: string): Promise<ClinicSummary[]> {
  const clinics = await db.coachingClinic.findMany({
    where: { coachId },
    orderBy: { startDate: 'desc' },
    include: {
      coach: {
        select: {
          user: { select: { name: true, image: true } },
        },
      },
    },
  })

  return clinics.map(toClinicSummary)
}

// ── 9. getCoachingMapData ─────────────────────────────────────

export async function getCoachingMapData(): Promise<{ coaches: CoachPin[]; clinics: ClinicPin[] }> {
  const [coachProfiles, upcomingClinics] = await Promise.all([
    db.coachProfile.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        specialties: true,
        hourlyRate: true,
        calcomLink: true,
        user: { select: { name: true } },
      },
    }),
    db.coachingClinic.findMany({
      where: {
        status: 'published',
        startDate: { gte: new Date() },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        startDate: true,
        latitude: true,
        longitude: true,
        costCents: true,
        isFree: true,
        calcomLink: true,
        coach: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    }),
  ])

  const coaches: CoachPin[] = coachProfiles.map((p) => ({
    id: p.id,
    name: p.user.name,
    latitude: p.latitude!,
    longitude: p.longitude!,
    specialties: (p.specialties as string[]) ?? [],
    hourlyRate: p.hourlyRate,
    calcomLink: p.calcomLink,
  }))

  const clinics: ClinicPin[] = upcomingClinics.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    startDate: c.startDate,
    latitude: c.latitude!,
    longitude: c.longitude!,
    costCents: c.costCents,
    isFree: c.isFree,
    calcomLink: c.calcomLink,
    coachName: c.coach.user.name,
  }))

  return { coaches, clinics }
}
