import 'server-only'
import { db } from '@/lib/db/client'
import type { FeedItem } from '../types'

const CANDIDATE_LIMIT = 50

export async function getFeedCandidates(cursor?: Date): Promise<FeedItem[]> {
  const cursorFilter = cursor ? { createdAt: { lt: cursor } } : {}

  const [courses, trailSystems, threads, events, reviews, listings] = await Promise.all([
    db.learnCourse.findMany({
      where: { status: 'published', ...cursorFilter },
      take: CANDIDATE_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, slug: true, difficulty: true,
        category: true, thumbnailUrl: true, createdAt: true,
        _count: { select: { modules: true } },
      },
    }),
    db.trailSystem.findMany({
      where: { status: 'open', ...cursorFilter },
      take: CANDIDATE_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, slug: true, city: true, state: true,
        trailCount: true, createdAt: true,
      },
    }),
    db.forumThread.findMany({
      where: cursorFilter,
      take: CANDIDATE_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, slug: true, viewCount: true, createdAt: true,
        category: { select: { name: true, slug: true } },
        _count: { select: { posts: true } },
      },
    }),
    db.event.findMany({
      where: { status: 'published', startDate: { gte: new Date() }, ...cursorFilter },
      take: CANDIDATE_LIMIT,
      orderBy: { startDate: 'asc' },
      select: {
        id: true, title: true, slug: true, location: true, startDate: true,
        eventType: true, imageUrl: true, createdAt: true,
        _count: { select: { rsvps: true } },
      },
    }),
    db.gearReview.findMany({
      where: cursorFilter,
      take: CANDIDATE_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, slug: true, brand: true, productName: true,
        rating: true, category: true, imageUrl: true, createdAt: true,
      },
    }),
    db.listing.findMany({
      where: { status: 'active', ...cursorFilter },
      take: CANDIDATE_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, slug: true, price: true, category: true,
        location: true, createdAt: true,
      },
    }),
  ])

  const items: FeedItem[] = [
    ...courses.map((c) => ({
      id: c.id,
      type: 'course' as const,
      title: c.title,
      subtitle: `${c._count.modules} module${c._count.modules !== 1 ? 's' : ''} · ${c.difficulty}`,
      url: `/learn/${c.slug}`,
      imageUrl: c.thumbnailUrl ?? undefined,
      tags: [c.difficulty, c.category.replace(/_/g, ' ')],
      meta: `${c._count.modules} modules`,
      category: c.category,
      engagementScore: c._count.modules,
      createdAt: c.createdAt,
    })),
    ...trailSystems.map((t) => ({
      id: t.id,
      type: 'trail' as const,
      title: t.name,
      subtitle: `${t.city ?? ''}${t.state ? `, ${t.state}` : ''} · ${t.trailCount} trails`,
      url: `/trails/${t.slug}`,
      tags: [],
      meta: `${t.trailCount} trails`,
      category: 'trail',
      engagementScore: t.trailCount,
      createdAt: t.createdAt,
    })),
    ...threads.map((t) => ({
      id: t.id,
      type: 'forum' as const,
      title: t.title,
      subtitle: t.category.name,
      url: `/forum/${t.category.slug}/${t.slug}`,
      tags: [t.category.name],
      meta: `${t._count.posts} replies`,
      category: `forum:${t.category.slug}`,
      engagementScore: t._count.posts,
      createdAt: t.createdAt,
    })),
    ...events.map((e) => ({
      id: e.id,
      type: 'event' as const,
      title: e.title,
      subtitle: `${e.startDate.toLocaleDateString()} · ${e.location}`,
      url: `/events/${e.slug}`,
      imageUrl: e.imageUrl ?? undefined,
      tags: [e.eventType.replace(/_/g, ' ')],
      meta: `${e._count.rsvps} going`,
      category: 'events',
      engagementScore: e._count.rsvps,
      createdAt: e.createdAt,
    })),
    ...reviews.map((r) => ({
      id: r.id,
      type: 'review' as const,
      title: r.title,
      subtitle: `${r.brand} ${r.productName}`,
      url: `/reviews/${r.slug}`,
      imageUrl: r.imageUrl ?? undefined,
      tags: [r.category.replace(/_/g, ' ')],
      meta: '⭐'.repeat(Math.min(r.rating, 5)),
      category: 'reviews',
      engagementScore: r.rating * 10,
      createdAt: r.createdAt,
    })),
    ...listings.map((l) => ({
      id: l.id,
      type: 'buysell' as const,
      title: l.title,
      subtitle: `$${l.price.toFixed(0)}${l.location ? ` · ${l.location}` : ''}`,
      url: `/marketplace/${l.slug}`,
      tags: [l.category.replace(/_/g, ' ')],
      meta: `$${l.price.toFixed(0)}`,
      category: 'buysell',
      engagementScore: 0,
      createdAt: l.createdAt,
    })),
  ]

  return items
}

export interface TrendingItem {
  id: string
  title: string
  url: string
  replyCount: number
  category: string
}

export async function getTrendingItems(limit: number = 5): Promise<TrendingItem[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const threads = await db.forumThread.findMany({
    where: { createdAt: { gte: since } },
    take: limit,
    orderBy: { _count: { posts: 'desc' } },
    select: {
      id: true,
      title: true,
      slug: true,
      viewCount: true,
      category: { select: { name: true, slug: true } },
      _count: { select: { posts: true } },
    },
  })

  return threads.map((t) => ({
    id: t.id,
    title: t.title,
    url: `/forum/${t.category.slug}/${t.slug}`,
    replyCount: t._count.posts,
    category: t.category.name,
  }))
}
