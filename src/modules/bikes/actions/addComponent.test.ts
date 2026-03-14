import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addComponent } from './addComponent'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }) }))
vi.mock('@/lib/db/client', () => ({
  db: {
    userBike: { findFirst: vi.fn() },
    bikeComponent: { create: vi.fn().mockResolvedValue({}) },
  },
}))

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(data).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('addComponent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(db.bikeComponent.create).mockResolvedValue({} as any)
  })

  it('adds a component successfully', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue({ id: 'bike-1', userId: 'user-1' } as any)
    const result = await addComponent({ errors: {} }, makeFormData({
      bikeId: 'bike-1', category: 'FORK', brand: 'Fox', model: '38 Factory', weightGrams: '2200',
    }))
    expect(result.success).toBe(true)
    expect(db.bikeComponent.create).toHaveBeenCalled()
  })

  it('rejects if bike does not belong to user', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(null)
    const result = await addComponent({ errors: {} }, makeFormData({
      bikeId: 'bike-1', category: 'FORK', brand: 'Fox', model: '38 Factory',
    }))
    expect(result.errors.general).toContain('not found')
  })

  it('validates required fields', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue({ id: 'bike-1' } as any)
    const result = await addComponent({ errors: {} }, makeFormData({
      bikeId: 'bike-1', category: 'FORK', brand: '', model: '',
    }))
    expect(result.errors.general).toBeTruthy()
  })
})
