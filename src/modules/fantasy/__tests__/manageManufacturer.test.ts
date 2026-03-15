import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db
vi.mock('@/lib/db/client', () => ({
  db: {
    bikeManufacturer: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }))

import { db } from '@/lib/db/client'

describe('createManufacturer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns name error for empty name', async () => {
    const { createManufacturer } = await import('../actions/admin/manageManufacturer')
    const fd = new FormData()
    fd.set('name', '')
    fd.set('slug', 'trek')
    const result = await createManufacturer({ errors: {} }, fd)
    expect(result.errors?.name).toBeTruthy()
  })

  it('returns slug error for empty slug', async () => {
    const { createManufacturer } = await import('../actions/admin/manageManufacturer')
    const fd = new FormData()
    fd.set('name', 'Trek')
    fd.set('slug', '')
    const result = await createManufacturer({ errors: {} }, fd)
    expect(result.errors?.slug).toBeTruthy()
  })

  it('calls db.bikeManufacturer.create with correct data', async () => {
    vi.mocked(db.bikeManufacturer.create).mockResolvedValue({ id: 'mfr_1', name: 'Trek', slug: 'trek', logoUrl: null } as any)
    const { createManufacturer } = await import('../actions/admin/manageManufacturer')
    const fd = new FormData()
    fd.set('name', 'Trek')
    fd.set('slug', 'trek')
    await createManufacturer({ errors: {} }, fd)
    expect(db.bikeManufacturer.create).toHaveBeenCalledWith({
      data: { name: 'Trek', slug: 'trek', logoUrl: undefined },
    })
  })
})
