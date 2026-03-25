import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    creatorVideo: { findUnique: vi.fn() },
    adCampaign: { findFirst: vi.fn() },
    adImpression: { count: vi.fn(), create: vi.fn() },
  },
}))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }))

import { db } from '@/lib/db/client'
import { rateLimit } from '@/lib/rate-limit'

const mockVideo = {
  id: 'vid_1',
  creatorId: 'creator_1',
  category: 'trails',
  status: 'live',
}

const mockCampaign = {
  id: 'camp_1',
  advertiserName: 'Acme Bikes',
  creativeUrl: 'https://cdn.bunny.net/ads/acme.mp4',
  cpmCents: 800,
  dailyImpressionCap: 100,
  creatorTargets: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(db.creatorVideo.findUnique).mockResolvedValue(mockVideo as never)
  vi.mocked(db.adCampaign.findFirst).mockResolvedValue(mockCampaign as never)
  vi.mocked(db.adImpression.count).mockResolvedValue(0)
  vi.mocked(db.adImpression.create).mockResolvedValue({ id: 'imp_1' } as never)
})

function makeRequest(videoId: string) {
  return new NextRequest(`http://localhost/api/creators/ads/vast?videoId=${videoId}`)
}

describe('GET /api/creators/ads/vast', () => {
  it('returns empty VAST when rate limit exceeded', async () => {
    vi.mocked(rateLimit).mockRejectedValue(new Error('Rate limit exceeded'))
    const res = await GET(makeRequest('vid_1'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when videoId missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/creators/ads/vast'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when video not found', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue(null)
    const res = await GET(makeRequest('missing'))
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when no eligible campaign', async () => {
    vi.mocked(db.adCampaign.findFirst).mockResolvedValue(null)
    const res = await GET(makeRequest('vid_1'))
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when daily cap reached', async () => {
    vi.mocked(db.adImpression.count).mockResolvedValue(100)
    const res = await GET(makeRequest('vid_1'))
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns VAST XML with ad when campaign available', async () => {
    const res = await GET(makeRequest('vid_1'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0">')
    expect(text).toContain('Acme Bikes')
    expect(text).toContain('acme.mp4')
  })

  it('creates pending AdImpression record', async () => {
    await GET(makeRequest('vid_1'))
    expect(db.adImpression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ campaignId: 'camp_1', videoId: 'vid_1', status: 'pending' }),
      }),
    )
  })
})
