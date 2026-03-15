import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import { uniqueSlug } from '@/lib/slugify'
import type { EventSummary, EventDetailData, EventType, RsvpStatus, EventRsvpData } from '../types'

// ── getUpcomingEvents ─────────────────────────────────────

interface EventFilters {
  eventType?: EventType
  search?: string
}

export async function getUpcomingEvents(
  filters?: EventFilters,
  page: number = 1,
  limit?: number,
): Promise<{ events: EventSummary[]; totalCount: number }> {
  const where: Record<string, unknown> = {
    startDate: { gte: new Date() },
    status: 'published',
  }

  if (filters?.eventType) {
    where.eventType = filters.eventType
  }

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { location: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [rawEvents, totalCount] = await Promise.all([
    db.event.findMany({
      where,
      ...(limit ? { take: limit } : paginate(page)),
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        location: true,
        startDate: true,
        endDate: true,
        eventType: true,
        imageUrl: true,
        creator: { select: { name: true } },
        _count: { select: { rsvps: true } },
      },
    }),
    db.event.count({ where }),
  ])

  const events: EventSummary[] = rawEvents.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    location: e.location,
    startDate: e.startDate,
    endDate: e.endDate,
    eventType: e.eventType as EventType,
    imageUrl: e.imageUrl,
    creatorName: e.creator.name,
    rsvpCount: e._count.rsvps,
  }))

  return { events, totalCount }
}

// ── getEventBySlug ────────────────────────────────────────

export async function getEventBySlug(slug: string): Promise<EventDetailData | null> {
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      creator: { select: { name: true, image: true } },
      rsvps: {
        include: {
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!event) return null

  const rsvps: EventRsvpData[] = event.rsvps.map((r) => ({
    id: r.id,
    userId: r.userId,
    status: r.status as RsvpStatus,
    createdAt: r.createdAt,
    userName: r.user.name,
    userImage: r.user.image,
  }))

  return {
    id: event.id,
    creatorId: event.creatorId,
    title: event.title,
    slug: event.slug,
    description: event.description,
    location: event.location,
    latitude: event.latitude,
    longitude: event.longitude,
    startDate: event.startDate,
    endDate: event.endDate,
    maxAttendees: event.maxAttendees,
    imageUrl: event.imageUrl,
    eventType: event.eventType as EventType,
    createdAt: event.createdAt,
    creatorName: event.creator.name,
    creatorImage: event.creator.image,
    rsvps,
    rsvpCount: rsvps.filter((r) => r.status === 'going').length,
  }
}

// ── createEvent ───────────────────────────────────────────

interface CreateEventInput {
  creatorId: string
  title: string
  description?: string
  location: string
  latitude?: number
  longitude?: number
  startDate: Date
  endDate?: Date
  maxAttendees?: number
  imageUrl?: string
  eventType?: EventType
}

export async function createEvent(input: CreateEventInput) {
  const slug = await uniqueSlug(input.title, async (candidate) => {
    const existing = await db.event.findUnique({ where: { slug: candidate } })
    return existing !== null
  })

  return db.event.create({
    data: {
      creatorId: input.creatorId,
      title: input.title,
      slug,
      description: input.description ?? null,
      location: input.location,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      maxAttendees: input.maxAttendees ?? null,
      imageUrl: input.imageUrl ?? null,
      eventType: input.eventType ?? 'group_ride',
    },
  })
}

// ── rsvpToEvent ───────────────────────────────────────────

export async function rsvpToEvent(
  eventId: string,
  userId: string,
  status: RsvpStatus,
) {
  if (status === 'going') {
    // Check capacity before creating/updating RSVP
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { maxAttendees: true },
    })

    if (event?.maxAttendees) {
      const goingCount = await db.eventRsvp.count({
        where: { eventId, status: 'going' },
      })
      // Allow if user is already going (they're just re-confirming)
      const existing = await db.eventRsvp.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
      })
      const isAlreadyGoing = existing?.status === 'going'

      if (!isAlreadyGoing && goingCount >= event.maxAttendees) {
        throw new Error('This event is at capacity')
      }
    }
  }

  return db.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status },
    create: { eventId, userId, status },
  })
}

// ── getUserRsvps ──────────────────────────────────────────

export async function getUserRsvps(
  userId: string,
  page: number = 1,
): Promise<{ rsvps: (EventSummary & { rsvpStatus: RsvpStatus })[]; totalCount: number }> {
  const where = {
    userId,
    event: {
      startDate: { gte: new Date() },
      status: 'published' as const,
    },
  }

  const [rawRsvps, totalCount] = await Promise.all([
    db.eventRsvp.findMany({
      where,
      ...paginate(page),
      orderBy: { event: { startDate: 'asc' } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            location: true,
            startDate: true,
            endDate: true,
            eventType: true,
            imageUrl: true,
            creator: { select: { name: true } },
            _count: { select: { rsvps: true } },
          },
        },
      },
    }),
    db.eventRsvp.count({ where }),
  ])

  const rsvps = rawRsvps.map((r) => ({
    id: r.event.id,
    title: r.event.title,
    slug: r.event.slug,
    location: r.event.location,
    startDate: r.event.startDate,
    endDate: r.event.endDate,
    eventType: r.event.eventType as EventType,
    imageUrl: r.event.imageUrl,
    creatorName: r.event.creator.name,
    rsvpCount: r.event._count.rsvps,
    rsvpStatus: r.status as RsvpStatus,
  }))

  return { rsvps, totalCount }
}

// ── getEventComments ──────────────────────────────────────

export async function getEventComments(eventId: string) {
  return db.eventComment.findMany({
    where: { eventId, parentId: null },
    include: {
      user: { select: { name: true } },
      replies: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ── deleteEvent ───────────────────────────────────────────

export async function deleteEvent(
  eventId: string,
  userId: string,
): Promise<boolean> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { creatorId: true },
  })

  if (!event || event.creatorId !== userId) {
    return false
  }

  await db.event.delete({ where: { id: eventId } })
  return true
}
