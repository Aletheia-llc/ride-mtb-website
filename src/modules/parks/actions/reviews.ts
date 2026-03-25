'use server'

import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { screenText } from '../lib/moderation'
import { revalidatePath } from 'next/cache'

export async function submitFacilityReview(
  facilityId: string,
  rating: number,
  body: string | null,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()

  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }

  // Screen text if provided
  if (body && body.trim().length > 0) {
    const verdict = await screenText(body.trim())
    if (verdict === 'REJECTED') {
      return { success: false, error: 'Review contains content that violates our community guidelines.' }
    }
  }

  const facility = await db.facility.findUnique({ where: { id: facilityId }, select: { stateSlug: true, slug: true } })
  if (!facility) return { success: false, error: 'Facility not found' }

  await db.facilityReview.upsert({
    where: { facilityId_userId: { facilityId, userId: user.id } },
    create: { facilityId, userId: user.id, rating, body: body?.trim() ?? null },
    update: { rating, body: body?.trim() ?? null },
  })

  revalidatePath(`/parks/${facility.stateSlug}/${facility.slug}`)
  return { success: true }
}

export async function getFacilityReviews(facilityId: string) {
  return db.facilityReview.findMany({
    where: { facilityId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, image: true } },
    },
  })
}
