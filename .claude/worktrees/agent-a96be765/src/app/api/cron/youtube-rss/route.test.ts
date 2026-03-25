import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findMany: vi.fn() },
    creatorVideo: { findMany: vi.fn() },
  },
}))
vi.mock('@/modules/creators/lib/youtube', () => ({
  parseRssFeed: vi.fn(),
}))
vi.mock('@/lib/pgboss', () => ({
  getBoss: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue('job-id') }),
}))

import { db } from '@/lib/db/client'
import { parseRssFeed } from '@/modules/creators/lib/youtube'
import { getBoss } from '@/lib/pgboss'

process.env.CRON_SECRET = 'test-secret'

function makeRequest() {
  return new NextRequest('http://localhost/api/cron/youtube-rss', {
    headers: { authorization: 'Bearer test-secret' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(db.creatorProfile.findMany).mockResolvedValue([
    { id: 'creator_1', youtubeChannelId: 'UCxxxxx' },
  ] as never)
  vi.mocked(db.creatorVideo.findMany).mockResolvedValue([])
  vi.mocked(parseRssFeed).mockResolvedValue(['video_new', 'video_existing'])
  vi.mocked(getBoss).mockResolvedValue({ send: vi.fn().mockResolvedValue('job-id') } as never)
})

describe('GET /api/cron/youtube-rss', () => {
  it('returns 401 without valid cron secret', async () => {
    const res = await GET(new NextRequest('http://localhost/api/cron/youtube-rss'))
    expect(res.status).toBe(401)
  })

  it('enqueues new videos (skips existing)', async () => {
    vi.mocked(db.creatorVideo.findMany).mockResolvedValue([
      { youtubeVideoId: 'video_existing' },
    ] as never)
    const mockSend = vi.fn().mockResolvedValue('job-id')
    vi.mocked(getBoss).mockResolvedValue({ send: mockSend } as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith('video.ingest', expect.objectContaining({
      youtubeVideoId: 'video_new',
      source: 'rss',
    }))
  })

  it('skips creators without youtubeChannelId', async () => {
    vi.mocked(db.creatorProfile.findMany).mockResolvedValue([
      { id: 'creator_1', youtubeChannelId: null },
    ] as never)
    const mockSend = vi.fn()
    vi.mocked(getBoss).mockResolvedValue({ send: mockSend } as never)

    await GET(makeRequest())
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns ok response with enqueued count and timestamp', async () => {
    // No existing videos in DB → all 2 RSS IDs are new → enqueued = 2
    vi.mocked(db.creatorVideo.findMany).mockResolvedValue([])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.enqueued).toBe(2)
    expect(typeof body.timestamp).toBe('string')
  })
})
