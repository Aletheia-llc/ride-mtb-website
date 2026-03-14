import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEventComment } from './createEventComment'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    event: { findUnique: vi.fn() },
    eventComment: { create: vi.fn() },
  },
}))

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

describe('createEventComment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(db.eventComment.create).mockResolvedValue({} as never)
  })

  it('creates a top-level comment', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue({ id: 'event-1' } as any)
    const fd = new FormData()
    fd.append('eventId', 'event-1')
    fd.append('body', 'Looking forward to this race!')
    const result = await createEventComment({ errors: {} }, fd)
    expect(result.success).toBe(true)
    expect(db.eventComment.create).toHaveBeenCalled()
  })

  it('creates a threaded reply with parentId', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue({ id: 'event-1' } as any)
    const fd = new FormData()
    fd.append('eventId', 'event-1')
    fd.append('body', 'Me too!')
    fd.append('parentId', 'comment-parent-1')
    const result = await createEventComment({ errors: {} }, fd)
    expect(result.success).toBe(true)
    expect(db.eventComment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ parentId: 'comment-parent-1' })
    }))
  })

  it('returns error for non-existent event', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue(null)
    const fd = new FormData()
    fd.append('eventId', 'bad-id')
    fd.append('body', 'Some comment')
    const result = await createEventComment({ errors: {} }, fd)
    expect(result.errors.general).toContain('not found')
  })

  it('rejects empty body', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue({ id: 'event-1' } as any)
    const fd = new FormData()
    fd.append('eventId', 'event-1')
    fd.append('body', '')
    const result = await createEventComment({ errors: {} }, fd)
    expect(result.errors.general).toBeTruthy()
  })
})
