import { describe, it, expect, vi, beforeEach } from 'vitest'

// Auth mock — returns null by default (unauthenticated)
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

// Rate limit mock — passes by default
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue(undefined),
}))

// DB mock
vi.mock('@/lib/db/client', () => ({
  db: {
    learnCourse: { findUnique: vi.fn() },
    learnChatMessage: { create: vi.fn() },
  },
}))

// Anthropic SDK mock
vi.mock('@anthropic-ai/sdk', () => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Great question! Here is how you should corner...' }],
  })
  class MockAnthropic {
    messages = { create }
  }
  return { default: MockAnthropic }
})

import { POST } from './route'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db/client'

const mockSession = { user: { id: 'user-1', name: 'Test Rider' } }

describe('POST /api/learn/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I corner better?' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when message is missing', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('message_required')
  })

  it('returns 400 when message is empty string', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('message_required')
  })

  it('returns 400 when message exceeds 1000 characters', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'a'.repeat(1001) }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('message_too_long')
  })

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)
    vi.mocked(rateLimit).mockRejectedValueOnce(
      new Error('Rate limit exceeded. Please try again in a moment.'),
    )

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I corner better?' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toBe('rate_limit')
  })

  it('returns 200 with response on success', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)
    vi.mocked(db.learnChatMessage.create).mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I corner better?' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(typeof body.response).toBe('string')
    expect(body.response.length).toBeGreaterThan(0)
  })

  it('calls rateLimit with correct userId and action', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)
    vi.mocked(db.learnChatMessage.create).mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I corner better?' }),
    })

    await POST(request)

    expect(rateLimit).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'learn-chat',
      maxPerMinute: 1,
    })
  })

  it('saves user message and assistant response to DB', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockSession as never)
    vi.mocked(db.learnChatMessage.create).mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/learn/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I corner better?' }),
    })

    await POST(request)

    expect(db.learnChatMessage.create).toHaveBeenCalledTimes(2)
    expect(db.learnChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'user', userId: 'user-1' }),
      }),
    )
    expect(db.learnChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'assistant', userId: 'user-1' }),
      }),
    )
  })
})
