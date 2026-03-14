import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reportCondition } from './reportCondition'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }) }))
vi.mock('@/lib/db/client', () => ({
  db: {
    conditionReport: { create: vi.fn().mockResolvedValue({}) },
    trail: { update: vi.fn().mockResolvedValue({}) },
  },
}))

import { db } from '@/lib/db/client'

describe('reportCondition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.conditionReport.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(db.trail.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  it('creates condition report and updates trail', async () => {
    const formData = new FormData()
    formData.append('trailId', 'trail-1')
    formData.append('condition', 'TACKY')
    formData.append('notes', 'Perfect conditions after yesterday rain')
    const result = await reportCondition({ errors: {} }, formData)
    expect(result.success).toBe(true)
    expect(db.conditionReport.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ trailId: 'trail-1', condition: 'TACKY' }) })
    )
    expect(db.trail.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentCondition: 'TACKY' }) })
    )
  })

  it('rejects invalid condition type', async () => {
    const formData = new FormData()
    formData.append('trailId', 'trail-1')
    formData.append('condition', 'PERFECT')
    const result = await reportCondition({ errors: {} }, formData)
    expect(result.errors.general).toBeTruthy()
  })

  it('allows optional notes', async () => {
    const formData = new FormData()
    formData.append('trailId', 'trail-1')
    formData.append('condition', 'DRY')
    const result = await reportCondition({ errors: {} }, formData)
    expect(result.success).toBe(true)
  })
})
