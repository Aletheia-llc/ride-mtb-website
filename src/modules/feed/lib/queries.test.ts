import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFeedCandidates, getTrendingItems } from './queries'

vi.mock('@/lib/db/client', () => ({
  db: {
    learnCourse: { findMany: vi.fn() },
    trailSystem: { findMany: vi.fn() },
    post: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    gearReview: { findMany: vi.fn() },
    listing: { findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db/client'

describe('getFeedCandidates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns items from all 6 content types', async () => {
    vi.mocked(db.learnCourse.findMany).mockResolvedValueOnce([
      { id: 'c1', title: 'Course 1', slug: 'course-1', difficulty: 'beginner', category: 'riding_skills', thumbnailUrl: null, createdAt: new Date(), _count: { modules: 5 } },
    ] as never)
    vi.mocked(db.trailSystem.findMany).mockResolvedValueOnce([])
    vi.mocked(db.post.findMany).mockResolvedValueOnce([])
    vi.mocked(db.event.findMany).mockResolvedValueOnce([])
    vi.mocked(db.gearReview.findMany).mockResolvedValueOnce([])
    vi.mocked(db.listing.findMany).mockResolvedValueOnce([])

    const items = await getFeedCandidates()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].type).toBe('course')
  })

  it('maps course fields correctly', async () => {
    const mockCourse = {
      id: 'c1', title: 'Body Position', slug: 'body-position',
      difficulty: 'intermediate', category: 'riding_skills',
      thumbnailUrl: 'https://example.com/img.jpg', createdAt: new Date(),
      _count: { modules: 3 },
    }
    vi.mocked(db.learnCourse.findMany).mockResolvedValueOnce([mockCourse] as never)
    vi.mocked(db.trailSystem.findMany).mockResolvedValueOnce([])
    vi.mocked(db.post.findMany).mockResolvedValueOnce([])
    vi.mocked(db.event.findMany).mockResolvedValueOnce([])
    vi.mocked(db.gearReview.findMany).mockResolvedValueOnce([])
    vi.mocked(db.listing.findMany).mockResolvedValueOnce([])

    const items = await getFeedCandidates()
    const course = items.find((i) => i.type === 'course')
    expect(course?.url).toBe('/learn/body-position')
    expect(course?.engagementScore).toBe(3)
    expect(course?.category).toBe('riding_skills')
  })
})

describe('getTrendingItems', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns forum threads ordered by post count', async () => {
    vi.mocked(db.post.findMany).mockResolvedValueOnce([
      { id: 't1', title: 'Hot topic', slug: 'hot-topic', viewCount: 100, category: { name: 'General', slug: 'general-discussion' }, _count: { posts: 42 } },
    ] as never)

    const items = await getTrendingItems()
    expect(items.length).toBe(1)
    expect(items[0].title).toBe('Hot topic')
  })
})
