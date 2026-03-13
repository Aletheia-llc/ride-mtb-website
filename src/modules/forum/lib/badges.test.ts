import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    forumPost: {
      count: vi.fn(),
    },
    forumThread: {
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    forumUserBadge: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'
import { checkAndGrantBadges } from './badges'

describe('checkAndGrantBadges', () => {
  beforeEach(() => vi.clearAllMocks())

  it('grants first-post badge when user has exactly 1 post', async () => {
    vi.mocked(db.forumPost.count).mockResolvedValue(1)
    vi.mocked(db.forumThread.count).mockResolvedValue(0)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      karma: 0,
      createdAt: new Date(),
    } as never)
    vi.mocked(db.forumUserBadge.upsert).mockResolvedValue({} as never)

    await checkAndGrantBadges('user-1', 'post')

    expect(db.forumUserBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_badgeSlug: { userId: 'user-1', badgeSlug: 'first-post' } },
        create: expect.objectContaining({ userId: 'user-1', badgeSlug: 'first-post' }),
      }),
    )
  })

  it('does not grant first-post badge when user has 0 posts', async () => {
    vi.mocked(db.forumPost.count).mockResolvedValue(0)
    vi.mocked(db.forumThread.count).mockResolvedValue(0)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      karma: 0,
      createdAt: new Date(),
    } as never)

    await checkAndGrantBadges('user-1', 'post')

    const upsertCalls = vi.mocked(db.forumUserBadge.upsert).mock.calls
    const firstPostCalls = upsertCalls.filter((call) => {
      const arg = call[0] as { where?: { userId_badgeSlug?: { badgeSlug?: string } } }
      return arg.where?.userId_badgeSlug?.badgeSlug === 'first-post'
    })
    expect(firstPostCalls).toHaveLength(0)
  })

  it('upsert is idempotent — calling twice with postCount=2 upserts first-post twice (DB unique constraint prevents duplication)', async () => {
    vi.mocked(db.forumPost.count).mockResolvedValue(2)
    vi.mocked(db.forumThread.count).mockResolvedValue(0)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1',
      karma: 0,
      createdAt: new Date(),
    } as never)
    vi.mocked(db.forumUserBadge.upsert).mockResolvedValue({} as never)

    // Call twice — upsert is idempotent at DB level
    await checkAndGrantBadges('user-1', 'post')
    await checkAndGrantBadges('user-1', 'post')

    // first-post badge condition (>= 1) is met for count=2, so upsert IS called
    // The DB unique constraint (not app logic) prevents actual duplicates
    const upsertCalls = vi.mocked(db.forumUserBadge.upsert).mock.calls
    const firstPostCalls = upsertCalls.filter((call) => {
      const arg = call[0] as { where?: { userId_badgeSlug?: { badgeSlug?: string } } }
      return arg.where?.userId_badgeSlug?.badgeSlug === 'first-post'
    })
    // Called twice (once per checkAndGrantBadges call), DB handles idempotency
    expect(firstPostCalls).toHaveLength(2)
  })
})
