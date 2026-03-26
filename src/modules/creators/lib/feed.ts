import 'server-only'
import { db } from '@/lib/db/client'
import type { FeedItem } from '@/modules/feed/types'

export async function getCreatorVideoFeedItems(limit: number): Promise<FeedItem[]> {
  const videos = await db.creatorVideo.findMany({
    where: { status: 'live' },
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      viewCount: true,
      category: true,
      createdAt: true,
      creator: { select: { displayName: true } },
    },
  })

  return videos.map((v) => ({
    id: v.id,
    type: 'creator_video' as const,
    title: v.title,
    subtitle: `by ${v.creator.displayName}`,
    url: `/creators/videos/${v.id}`,
    imageUrl: v.thumbnailUrl ?? undefined,
    tags: [v.category.replace(/_/g, ' ')],
    meta: `${v.viewCount.toLocaleString()} views`,
    category: 'creator_video',
    engagementScore: v.viewCount,
    createdAt: v.createdAt,
  }))
}
