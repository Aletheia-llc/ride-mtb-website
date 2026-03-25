'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { rsvpToEvent } from '../lib/queries'
import type { RsvpStatus } from '../types'

export async function rsvpEvent(
  eventId: string,
  status: RsvpStatus,
): Promise<{ success: boolean }> {
  try {
    const user = await requireAuth()

    await rateLimit({ userId: user.id, action: 'rsvp-event', maxPerMinute: 10 })

    await rsvpToEvent(eventId, user.id, status)

    revalidatePath('/events')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { success: false }
    }
    return { success: false }
  }
}
