import 'server-only'
import { db } from '@/lib/db/client'
import type { FeedItem } from '@/modules/feed/types'

export async function getArticleFeedItems(limit: number): Promise<FeedItem[]> {
  const articles = await db.article.findMany({
    where: { status: 'published' },
    take: limit,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      category: true,
      publishedAt: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  })

  return articles.map((a) => ({
    id: a.id,
    type: 'article' as const,
    title: a.title,
    subtitle: a.excerpt ?? a.author.name ?? '',
    url: `/news/${a.slug}`,
    imageUrl: a.coverImageUrl ?? undefined,
    tags: [a.category.replace(/_/g, ' ')],
    meta: a.author.name ?? '',
    category: 'article',
    engagementScore: 0,
    createdAt: a.publishedAt ?? a.createdAt,
  }))
}
