import { describe, it, expect, vi, beforeEach } from 'vitest'
import { publishVideo } from './publishVideo'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findUnique: vi.fn() },
    creatorVideo: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user_1', email: 'a@b.com', role: 'user' } as never)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({ id: 'creator_1' } as never)
  vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({
    id: 'vid_1',
    creatorId: 'creator_1',
    status: 'pending_review',
  } as never)
  vi.mocked(db.creatorVideo.update).mockResolvedValue({} as never)
})

describe('publishVideo', () => {
  it('sets status=live and tagsConfirmedAt', async () => {
    const result = await publishVideo({ videoId: 'vid_1' })
    expect(result.errors).toEqual({})
    expect(result.success).toBe(true)
    expect(db.creatorVideo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'live', tagsConfirmedAt: expect.any(Date) }),
      }),
    )
  })

  it('returns error if video not in pending_review state', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({ id: 'vid_1', creatorId: 'creator_1', status: 'live' } as never)
    const result = await publishVideo({ videoId: 'vid_1' })
    expect(result.errors.general).toBeTruthy()
  })

  it('returns error if video belongs to different creator', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({ id: 'vid_1', creatorId: 'creator_other', status: 'pending_review' } as never)
    const result = await publishVideo({ videoId: 'vid_1' })
    expect(result.errors.general).toBeTruthy()
  })
})
