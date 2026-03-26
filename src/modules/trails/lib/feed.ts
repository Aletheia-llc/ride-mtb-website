import 'server-only'
import { db } from '@/lib/db/client'
import type { FeedItem } from '@/modules/feed/types'

export async function getTrailReviewFeedItems(limit: number): Promise<FeedItem[]> {
  const reviews = await db.trailReview.findMany({
    where: { isHidden: false },
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      title: true,
      createdAt: true,
      user: { select: { name: true } },
      trail: {
        select: {
          name: true,
          slug: true,
          system: { select: { slug: true } },
        },
      },
    },
  })

  return reviews.map((r) => ({
    id: r.id,
    type: 'trail_review' as const,
    title: r.title ?? `${r.user.name ?? 'Someone'} reviewed ${r.trail.name}`,
    subtitle: `${r.trail.name} · ${'★'.repeat(Math.min(r.rating, 5))}`,
    url: `/trails/explore/${r.trail.system.slug}/${r.trail.slug}#reviews`,
    tags: [r.trail.name],
    meta: '★'.repeat(Math.min(r.rating, 5)),
    category: 'trail_review',
    engagementScore: r.rating,
    createdAt: r.createdAt,
  }))
}
