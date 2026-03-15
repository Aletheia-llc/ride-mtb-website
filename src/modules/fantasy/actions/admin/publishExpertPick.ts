'use server'

import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const setPickSchema = z.object({
  eventId: z.string().cuid(),
  riderId: z.string().cuid(),
  slot: z.number().int().min(1).max(6),
})

const publishPicksSchema = z.object({
  eventId: z.string().cuid(),
})

export type SetPickState = {
  errors: Record<string, string>
  success?: boolean
}

export type PublishPicksState = {
  errors: Record<string, string>
  success?: boolean
}

export async function setExpertPick(data: {
  eventId: string
  riderId: string
  slot: number
}): Promise<SetPickState> {
  try {
    await requireAdmin()

    const parsed = setPickSchema.safeParse(data)
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

    const { eventId, riderId, slot } = parsed.data

    // Verify event exists
    const event = await db.fantasyEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    })
    if (!event) {
      return { errors: { general: 'Event not found' } }
    }

    // Verify rider exists and is in this event
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      select: { id: true },
    })
    if (!rider) {
      return { errors: { general: 'Rider not found' } }
    }

    // Check if rider is in event roster
    const inEvent = await db.fantasyRosterEntry.findUnique({
      where: { eventId_riderId: { eventId, riderId } },
      select: { id: true },
    })
    if (!inEvent) {
      return { errors: { general: 'Rider is not in this event roster' } }
    }

    // Upsert the pick
    await db.expertPick.upsert({
      where: { eventId_slot: { eventId, slot } },
      create: { eventId, riderId, slot, publishedAt: null, publishedByUserId: null },
      update: { riderId, publishedAt: null, publishedByUserId: null },
    })

    revalidatePath(`/admin/fantasy/expert-picks/${eventId}`)
    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to set expert pick. Please try again.' } }
  }
}

export async function publishExpertPicks(eventId: string): Promise<PublishPicksState> {
  try {
    const user = await requireAdmin()

    const parsed = publishPicksSchema.safeParse({ eventId })
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

    const { eventId: validEventId } = parsed.data

    // Verify event exists
    const event = await db.fantasyEvent.findUnique({
      where: { id: validEventId },
      select: { id: true },
    })
    if (!event) {
      return { errors: { general: 'Event not found' } }
    }

    // Update all unpublished picks for this event
    await db.expertPick.updateMany({
      where: { eventId: validEventId, publishedAt: null },
      data: { publishedAt: new Date(), publishedByUserId: user.id },
    })

    revalidatePath(`/admin/fantasy/expert-picks/${validEventId}`)
    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to publish expert picks. Please try again.' } }
  }
}
