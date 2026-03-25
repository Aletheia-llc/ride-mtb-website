import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

// Mock db
vi.mock('@/lib/db/client', () => ({
  db: {
    forumPost: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    forumThread: {
      update: vi.fn(),
    },
  },
}))

import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { PATCH, DELETE } from './route'

function makeRequest(method: string, body?: object) {
  return new NextRequest(`http://localhost/api/forum/posts/post-1`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

const mockParams = Promise.resolve({ id: 'post-1' })

describe('PATCH /api/forum/posts/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('PATCH', { content: 'updated' })
    const res = await PATCH(req, { params: mockParams })
    expect(res.status).toBe(401)
  })

  it('returns 403 when edit window has expired for non-admin', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' },
    } as never)
    const oldDate = new Date(Date.now() - 20 * 60 * 1000) // 20 min ago
    vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
      id: 'post-1',
      authorId: 'user-1',
      deletedAt: null,
      createdAt: oldDate,
      content: 'original',
    } as never)
    const req = makeRequest('PATCH', { content: 'updated' })
    const res = await PATCH(req, { params: mockParams })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('edit_window_expired')
  })

  it('returns 200 and updates post within edit window', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' },
    } as never)
    const recentDate = new Date(Date.now() - 5 * 60 * 1000) // 5 min ago
    vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
      id: 'post-1',
      authorId: 'user-1',
      deletedAt: null,
      createdAt: recentDate,
      content: 'original',
    } as never)
    vi.mocked(db.forumPost.update).mockResolvedValueOnce({
      id: 'post-1',
      content: 'updated',
      editedAt: new Date(),
    } as never)
    const req = makeRequest('PATCH', { content: 'updated' })
    const res = await PATCH(req, { params: mockParams })
    expect(res.status).toBe(200)
    expect(db.forumPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'post-1' },
        data: expect.objectContaining({ content: 'updated' }),
      }),
    )
  })
})

describe('DELETE /api/forum/posts/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const req = makeRequest('DELETE')
    const res = await DELETE(req, { params: mockParams })
    expect(res.status).toBe(401)
  })

  it('soft-deletes a post by setting deletedAt', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' },
    } as never)
    vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
      id: 'post-1',
      authorId: 'user-1',
      isFirst: false,
      threadId: 'thread-1',
      deletedAt: null,
    } as never)
    vi.mocked(db.forumPost.update).mockResolvedValueOnce({} as never)
    const req = makeRequest('DELETE')
    const res = await DELETE(req, { params: mockParams })
    expect(res.status).toBe(204)
    expect(db.forumPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'post-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })

  it('also soft-deletes the thread when isFirst post is deleted', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'user' },
    } as never)
    vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
      id: 'post-1',
      authorId: 'user-1',
      isFirst: true,
      threadId: 'thread-1',
      deletedAt: null,
    } as never)
    vi.mocked(db.forumPost.update).mockResolvedValueOnce({} as never)
    vi.mocked(db.forumThread.update).mockResolvedValueOnce({} as never)
    const req = makeRequest('DELETE')
    const res = await DELETE(req, { params: mockParams })
    expect(res.status).toBe(204)
    expect(db.forumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'thread-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })
})
