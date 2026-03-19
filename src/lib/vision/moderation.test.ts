import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock server-only FIRST — it throws at import time outside Next.js runtime
vi.mock('server-only', () => ({}))

// Mock @google-cloud/vision before importing the module under test
vi.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: vi.fn().mockImplementation(() => ({
    safeSearchDetection: vi.fn(),
  })),
}))

import { ImageAnnotatorClient } from '@google-cloud/vision'
import { checkImageSafety } from './moderation'

const mockClient = { safeSearchDetection: vi.fn() }

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(ImageAnnotatorClient).mockImplementation(function () { return mockClient } as any)
})

describe('checkImageSafety', () => {
  const buffer = Buffer.from('fake-image-data')

  it('returns pass:true when SafeSearch finds no issues', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: {
        adult: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'POSSIBLE',
        medical: 'UNLIKELY',
        spoof: 'VERY_UNLIKELY',
      },
    }])
    const result = await checkImageSafety(buffer)
    expect(result).toEqual({ pass: true })
  })

  it('returns pass:false when adult is LIKELY', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'LIKELY', violence: 'VERY_UNLIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result.pass).toBe(false)
  })

  it('returns pass:false when adult is VERY_LIKELY', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'VERY_LIKELY', violence: 'UNLIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result.pass).toBe(false)
  })

  it('returns pass:false when violence is LIKELY', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'VERY_UNLIKELY', violence: 'LIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result.pass).toBe(false)
  })

  it('returns pass:true when adult is POSSIBLE (below threshold)', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'POSSIBLE', violence: 'UNLIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result).toEqual({ pass: true })
  })

  it('returns pass:true when SafeSearch returns no annotation', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{ safeSearchAnnotation: null }])
    const result = await checkImageSafety(buffer)
    expect(result).toEqual({ pass: true })
  })
})
