'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { createEvent } from '../lib/queries'
import type { EventType } from '../types'

const validEventTypes: EventType[] = [
  'group_ride',
  'race',
  'skills_clinic',
  'trail_work',
  'social',
  'demo_day',
  'other',
]

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().max(5000, 'Description must be at most 5,000 characters').optional(),
  location: z.string().min(1, 'Location is required').max(500, 'Location must be at most 500 characters'),
  startDate: z.string().min(1, 'Start date is required').transform((val) => {
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error('Invalid date')
    return date
  }),
  endDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    const date = new Date(val)
    if (isNaN(date.getTime())) throw new Error('Invalid date')
    return date
  }),
  maxAttendees: z.coerce
    .number()
    .int('Max attendees must be a whole number')
    .positive('Max attendees must be positive')
    .optional()
    .or(z.literal('')),
  eventType: z.string().refine(
    (val): val is EventType => validEventTypes.includes(val as EventType),
    'Invalid event type',
  ).optional(),
})

export type CreateEventState = {
  errors: Record<string, string>
  success?: boolean
}

export async function createEventAction(
  _prevState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  let slug: string | undefined

  try {
    const user = await requireAuth()

    const raw = {
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      location: formData.get('location'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate') || undefined,
      maxAttendees: formData.get('maxAttendees') || undefined,
      eventType: formData.get('eventType') || undefined,
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

    const { title, description, location, startDate, endDate, maxAttendees, eventType } = parsed.data

    await rateLimit({ userId: user.id, action: 'create-event', maxPerMinute: 3 })

    const event = await createEvent({
      creatorId: user.id,
      title,
      description: description || undefined,
      location,
      startDate,
      endDate,
      maxAttendees: typeof maxAttendees === 'number' ? maxAttendees : undefined,
      eventType: (eventType as EventType) ?? 'group_ride',
    })

    slug = event.slug

    await grantXP({
      userId: user.id,
      event: 'event_created',
      module: 'events',
      refId: event.id,
    })

    revalidatePath('/events')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }

  redirect(`/events/${slug}`)
}
