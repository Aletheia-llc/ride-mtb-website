'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import type { FantasyEventStatus } from '@/generated/prisma/client'

const createEventSchema = z.object({
  seriesId: z.string().min(1, 'Series is required'),
  name: z.string().min(1, 'Event name is required'),
  location: z.string().min(1, 'Location is required'),
  country: z.string().min(1, 'Country is required'),
  raceDate: z.string().min(1, 'Race date is required').transform(d => new Date(d)),
  rosterDeadline: z.string().min(1, 'Roster deadline is required').transform(d => new Date(d)),
  scraperUrl: z.string().url('Valid URL required'),
  scraperUrlStages: z.string().url().optional().or(z.literal('')),
})

const updateEventStatusSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  status: z.enum(['upcoming', 'roster_open', 'locked', 'results_pending', 'scored'] as const),
})

const addRiderToEventSchema = z.object({
  riderId: z.string().min(1, 'Rider is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  basePriceCents: z.number().int().positive('Price must be positive'),
})

export type CreateEventState = {
  errors: Record<string, string>
  success?: boolean
  eventId?: string
}

export type UpdateEventStatusState = {
  errors: Record<string, string>
  success?: boolean
}

export type AddRiderToEventState = {
  errors: Record<string, string>
  success?: boolean
}

export async function createEvent(
  _prevState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  try {
    await requireAdmin()

    const raw = {
      seriesId: formData.get('seriesId') as string,
      name: formData.get('name') as string,
      location: formData.get('location') as string,
      country: formData.get('country') as string,
      raceDate: formData.get('raceDate') as string,
      rosterDeadline: formData.get('rosterDeadline') as string,
      scraperUrl: formData.get('scraperUrl') as string,
      scraperUrlStages: formData.get('scraperUrlStages') as string,
    }

    const parsed = createEventSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { seriesId, name, location, country, raceDate, rosterDeadline, scraperUrl, scraperUrlStages } = parsed.data

    // Verify series exists
    const series = await db.fantasySeries.findUnique({ where: { id: seriesId } })
    if (!series) {
      return { errors: { seriesId: 'Series not found' } }
    }

    // Check for duplicate event name within series
    const existing = await db.fantasyEvent.findFirst({
      where: { seriesId, name },
    })

    if (existing) {
      return {
        errors: {
          name: `Event "${name}" already exists in this series`,
        },
      }
    }

    const event = await db.fantasyEvent.create({
      data: {
        seriesId,
        name,
        location,
        country,
        raceDate,
        rosterDeadline,
        scraperUrl,
        scraperUrlStages: scraperUrlStages || null,
        status: 'upcoming',
      },
    })

    revalidatePath('/admin/fantasy/events')

    return { errors: {}, success: true, eventId: event.id }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to create event. Please try again.' } }
  }
}

export async function updateEventStatus(
  _prevState: UpdateEventStatusState,
  formData: FormData,
): Promise<UpdateEventStatusState> {
  try {
    await requireAdmin()

    const raw = {
      id: formData.get('id') as string,
      status: formData.get('status') as string,
    }

    const parsed = updateEventStatusSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { id, status } = parsed.data

    await db.fantasyEvent.update({
      where: { id },
      data: { status: status as FantasyEventStatus },
    })

    revalidatePath('/admin/fantasy/events')
    revalidatePath(`/admin/fantasy/events/${id}`)

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to update event status. Please try again.' } }
  }
}

export async function addRiderToEvent(
  _prevState: AddRiderToEventState,
  formData: FormData,
): Promise<AddRiderToEventState> {
  try {
    await requireAdmin()

    const raw = {
      riderId: formData.get('riderId') as string,
      eventId: formData.get('eventId') as string,
      basePriceCents: parseInt(formData.get('basePriceCents') as string),
    }

    const parsed = addRiderToEventSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { riderId, eventId, basePriceCents } = parsed.data

    // Verify rider and event exist
    const [rider, event] = await Promise.all([
      db.rider.findUnique({ where: { id: riderId } }),
      db.fantasyEvent.findUnique({ where: { id: eventId } }),
    ])

    if (!rider) return { errors: { riderId: 'Rider not found' } }
    if (!event) return { errors: { eventId: 'Event not found' } }

    await db.riderEventEntry.upsert({
      where: { riderId_eventId: { riderId, eventId } },
      create: { riderId, eventId, basePriceCents, marketPriceCents: basePriceCents },
      update: { basePriceCents, marketPriceCents: basePriceCents },
    })

    revalidatePath(`/admin/fantasy/events/${eventId}`)

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to add rider to event. Please try again.' } }
  }
}
