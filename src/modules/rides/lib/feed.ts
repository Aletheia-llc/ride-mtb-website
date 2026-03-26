import 'server-only'
import { db } from '@/lib/db/client'
import type { FeedItem } from '@/modules/feed/types'

export async function getRideLogFeedItems(limit: number, followedUserIds?: string[]): Promise<FeedItem[]> {
  const logs = await db.rideLog.findMany({
    where: followedUserIds ? { userId: { in: followedUserIds } } : undefined,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      duration: true,
      createdAt: true,
      user: { select: { name: true } },
      trail: { select: { name: true } },
      trailSystem: { select: { name: true, slug: true } },
    },
  })

  return logs.map((log) => {
    const location = log.trail?.name ?? log.trailSystem?.name ?? null
    const subtitle = location
      ? `${location}${log.duration ? ` · ${log.duration}min` : ''}`
      : log.duration
        ? `${log.duration}min ride`
        : 'Open ride'

    return {
      id: log.id,
      type: 'ride_log' as const,
      title: `${log.user.name ?? 'Someone'} logged a ride`,
      subtitle,
      url: log.trailSystem ? `/trails/explore/${log.trailSystem.slug}` : '/rides',
      tags: log.trailSystem ? [log.trailSystem.name] : [],
      meta: log.duration ? `${log.duration} min` : 'Ride',
      category: 'ride_log',
      engagementScore: 0,
      createdAt: log.createdAt,
    }
  })
}
