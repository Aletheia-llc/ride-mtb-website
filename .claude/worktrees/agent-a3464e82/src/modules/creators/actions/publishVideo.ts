'use server'

import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export type PublishVideoState = { errors: Record<string, string>; success?: boolean }

export async function publishVideo({ videoId }: { videoId: string }): Promise<PublishVideoState> {
  try {
    const user = await requireAuth()
    const creator = await db.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!creator) return { errors: { general: 'Creator profile not found' } }

    const video = await db.creatorVideo.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true, status: true },
    })
    if (!video || video.creatorId !== creator.id) {
      return { errors: { general: 'Video not found' } }
    }
    if (video.status !== 'pending_review') {
      return { errors: { general: 'Video is not awaiting review' } }
    }

    await db.creatorVideo.update({
      where: { id: videoId },
      data: { status: 'live', tagsConfirmedAt: new Date() },
    })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
