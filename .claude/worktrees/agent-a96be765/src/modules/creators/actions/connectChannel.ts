'use server'

import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { resolveChannelId, fetchChannelBackCatalog } from '@/modules/creators/lib/youtube'
import { getBoss } from '@/lib/pgboss'

export type ConnectChannelState = { errors: Record<string, string>; success?: boolean; channelId?: string }

export async function connectChannel(
  _prev: ConnectChannelState,
  formData: FormData,
): Promise<ConnectChannelState> {
  try {
    await requireAdmin()
    const creatorProfileId = formData.get('creatorProfileId')
    const youtubeChannelUrl = formData.get('youtubeChannelUrl')

    if (typeof creatorProfileId !== 'string' || typeof youtubeChannelUrl !== 'string') {
      return { errors: { general: 'Missing fields' } }
    }

    const channelId = await resolveChannelId(youtubeChannelUrl)
    if (!channelId) {
      return { errors: { youtubeChannelUrl: 'Could not resolve YouTube channel ID. Check the URL.' } }
    }

    await db.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { youtubeChannelId: channelId },
    })

    // Enqueue back-catalog (up to 50 videos, staggered 30s apart)
    const videoIds = await fetchChannelBackCatalog(channelId, 50)
    const boss = await getBoss()
    for (let i = 0; i < videoIds.length; i++) {
      await boss.send(
        'video.ingest',
        { youtubeVideoId: videoIds[i], creatorId: creatorProfileId, source: 'backcatalog' },
        { startAfter: i * 30 }, // stagger by 30 seconds each
      )
    }

    return { errors: {}, success: true, channelId }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
