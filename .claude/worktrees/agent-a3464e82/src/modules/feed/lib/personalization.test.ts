import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scoreFeedItems, getBehaviorScores } from './personalization'
import type { FeedItem } from '../types'

// Mock Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    hgetall: vi.fn().mockResolvedValue(null),
  })),
}))

const makeFeedItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'i1',
  type: 'forum',
  title: 'Test',
  subtitle: '',
  url: '/forum/test',
  tags: [],
  meta: '',
  category: 'forum:general-discussion',
  engagementScore: 10,
  createdAt: new Date(),
  ...overrides,
})

describe('scoreFeedItems', () => {
  it('applies interest_tag_boost when item category matches user interests', () => {
    const item = makeFeedItem({ category: 'trail', engagementScore: 5 })
    const scored = scoreFeedItems([item], {
      interests: ['Trail'],
      skillLevel: null,
      ridingStyle: null,
      location: null,
    }, {})

    expect(scored[0].score).toBe(5 + 5) // base + interest_tag_boost
  })

  it('applies age_penalty for items older than 14 days', () => {
    const old = new Date()
    old.setDate(old.getDate() - 20) // 20 days ago
    const item = makeFeedItem({ createdAt: old, engagementScore: 10 })
    const scored = scoreFeedItems([item], { interests: [], skillLevel: null, ridingStyle: null, location: null }, {})
    // age_penalty = -2 * (20 - 14) = -12
    expect(scored[0].score).toBe(10 - 12)
  })

  it('applies behavior_boost from redis scores', () => {
    const item = makeFeedItem({ category: 'trail', engagementScore: 5 })
    const scored = scoreFeedItems([item], { interests: [], skillLevel: null, ridingStyle: null, location: null }, { trail: 7 })
    expect(scored[0].score).toBe(5 + 7) // base + behavior_boost
  })

  it('sorts by score descending', () => {
    const low = makeFeedItem({ id: 'low', engagementScore: 1 })
    const high = makeFeedItem({ id: 'high', engagementScore: 20 })
    const scored = scoreFeedItems([low, high], { interests: [], skillLevel: null, ridingStyle: null, location: null }, {})
    expect(scored[0].id).toBe('high')
  })
})

describe('getBehaviorScores', () => {
  it('returns empty object when Redis is not configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = ''
    process.env.UPSTASH_REDIS_REST_TOKEN = ''
    const result = await getBehaviorScores('user-1')
    expect(result).toEqual({})
  })
})
