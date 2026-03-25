import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findUnique: vi.fn() },
    creatorVideo: { findUnique: vi.fn(), create: vi.fn() },
  },
}))
vi.mock('@/lib/pgboss', () => ({
  getBoss: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue('job-id') }),
}))

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getBoss } from '@/lib/pgboss'

const mockCreator = { id: 'creator_1', status: 'active', userId: 'user_1' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user_1', email: 'a@b.com', role: 'user' } as never)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue(mockCreator as never)
})

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/creators/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/creators/videos', () => {
  it('rejects non-YouTube URLs', async () => {
    const res = await POST(makeRequest({ youtubeUrl: 'https://vimeo.com/123' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('YouTube')
  })

  it('rejects duplicate video', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({ id: 'vid_1' } as never)
    const res = await POST(makeRequest({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
    expect(res.status).toBe(409)
    // Verify the compound unique key name is used correctly
    expect(db.creatorVideo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creatorId_youtubeVideoId: { creatorId: 'creator_1', youtubeVideoId: 'dQw4w9WgXcQ' } },
      }),
    )
  })

  it('enqueues video.ingest job and creates CreatorVideo record', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue(null)
    vi.mocked(db.creatorVideo.create).mockResolvedValue({ id: 'vid_new' } as never)
    const mockSend = vi.fn().mockResolvedValue('job-id')
    vi.mocked(getBoss).mockResolvedValue({ send: mockSend } as never)

    const res = await POST(makeRequest({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
    expect(res.status).toBe(201)
    expect(mockSend).toHaveBeenCalledWith('video.ingest', expect.objectContaining({
      youtubeVideoId: 'dQw4w9WgXcQ',
      creatorId: 'creator_1',
      source: 'manual',
    }))
  })

  it('returns 403 if creator profile not active', async () => {
    vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({ ...mockCreator, status: 'onboarding' } as never)
    const res = await POST(makeRequest({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
    expect(res.status).toBe(403)
  })
})
