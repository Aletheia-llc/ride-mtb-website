import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { parseRssFeed } from '@/modules/creators/lib/youtube'
import { getBoss } from '@/lib/pgboss'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const creators = await db.creatorProfile.findMany({
    where: { status: 'active', youtubeChannelId: { not: null } },
    select: { id: true, youtubeChannelId: true },
  })

  let enqueued = 0

  for (const creator of creators) {
    if (!creator.youtubeChannelId) continue

    try {
      const rssVideoIds = await parseRssFeed(creator.youtubeChannelId)
      if (rssVideoIds.length === 0) continue

      const existing = await db.creatorVideo.findMany({
        where: { creatorId: creator.id, youtubeVideoId: { in: rssVideoIds } },
        select: { youtubeVideoId: true },
      })
      const existingIds = new Set(existing.map((v) => v.youtubeVideoId))
      const newIds = rssVideoIds.filter((id) => !existingIds.has(id))

      if (newIds.length === 0) continue

      const boss = await getBoss()
      for (const youtubeVideoId of newIds) {
        await boss.send('video.ingest', {
          youtubeVideoId,
          creatorId: creator.id,
          source: 'rss',
        })
        enqueued++
      }
    } catch (err) {
      console.error(`[youtube-rss] Failed for creator ${creator.id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    enqueued,
    timestamp: new Date().toISOString(),
  })
}
