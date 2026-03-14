'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { getBoss } from '@/lib/pgboss'
// eslint-disable-next-line no-restricted-imports
import { extractYouTubeVideoId } from '@/modules/creators/lib/youtube'

const schema = z.object({
  youtubeUrl: z.string().url('Must be a valid URL'),
})

export type SubmitVideoState = { errors: Record<string, string>; success?: boolean }

export async function submitVideo(_prev: SubmitVideoState, formData: FormData): Promise<SubmitVideoState> {
  try {
    const user = await requireAuth()
    const raw = { youtubeUrl: formData.get('youtubeUrl') }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return { errors: { youtubeUrl: parsed.error.issues[0]?.message ?? 'Invalid URL' } }
    }

    const videoId = extractYouTubeVideoId(parsed.data.youtubeUrl)
    if (!videoId) {
      return { errors: { general: 'Not a valid YouTube video URL' } }
    }

    const creator = await db.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    })
    if (!creator || creator.status !== 'active') {
      return { errors: { general: 'Creator account not active' } }
    }

    const existing = await db.creatorVideo.findUnique({
      where: { creatorId_youtubeVideoId: { creatorId: creator.id, youtubeVideoId: videoId } },
      select: { id: true },
    })
    if (existing) {
      return { errors: { general: 'This video has already been submitted' } }
    }

    await db.creatorVideo.create({
      data: { creatorId: creator.id, youtubeVideoId: videoId, title: `YouTube video ${videoId}`, status: 'queued' },
    })

    const boss = await getBoss()
    await boss.send('video.ingest', { youtubeVideoId: videoId, creatorId: creator.id, source: 'manual' })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
