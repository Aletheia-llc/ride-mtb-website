import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    post: { count: vi.fn() },
    comment: { count: vi.fn() },
    badge: { findUnique: vi.fn() },
    userBadge: { upsert: vi.fn() },
  },
}))

import { db } from '@/lib/db/client'
import { checkAndAwardBadges } from './badges'

const mockDb = db as unknown as {
  post: { count: ReturnType<typeof vi.fn> }
  comment: { count: ReturnType<typeof vi.fn> }
  badge: { findUnique: ReturnType<typeof vi.fn> }
  userBadge: { upsert: ReturnType<typeof vi.fn> }
}

describe('checkAndAwardBadges', () => {
  beforeEach(() => vi.clearAllMocks())

  it('awards first-post badge when user has 1 post', async () => {
    mockDb.post.count.mockResolvedValue(1)
    mockDb.comment.count.mockResolvedValue(0)
    mockDb.badge.findUnique.mockResolvedValue({ id: 'badge-1' })
    mockDb.userBadge.upsert.mockResolvedValue({})

    await checkAndAwardBadges('user-1')

    expect(mockDb.userBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_badgeId: { userId: 'user-1', badgeId: 'badge-1' } },
      }),
    )
  })

  it('does not award badge when count is below threshold', async () => {
    mockDb.post.count.mockResolvedValue(0)
    mockDb.comment.count.mockResolvedValue(0)
    mockDb.badge.findUnique.mockResolvedValue(null)
    mockDb.userBadge.upsert.mockResolvedValue({})

    await checkAndAwardBadges('user-1')

    expect(mockDb.userBadge.upsert).not.toHaveBeenCalled()
  })

  it('awards first-comment badge when user has 1 comment', async () => {
    mockDb.post.count.mockResolvedValue(0)
    mockDb.comment.count.mockResolvedValue(1)
    mockDb.badge.findUnique.mockResolvedValue({ id: 'badge-comment-1' })
    mockDb.userBadge.upsert.mockResolvedValue({})

    await checkAndAwardBadges('user-1')

    expect(mockDb.userBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_badgeId: { userId: 'user-1', badgeId: 'badge-comment-1' } },
      }),
    )
  })

  it('skips award when badge does not exist in db', async () => {
    mockDb.post.count.mockResolvedValue(10)
    mockDb.comment.count.mockResolvedValue(0)
    mockDb.badge.findUnique.mockResolvedValue(null)
    mockDb.userBadge.upsert.mockResolvedValue({})

    await checkAndAwardBadges('user-1')

    expect(mockDb.userBadge.upsert).not.toHaveBeenCalled()
  })
})
