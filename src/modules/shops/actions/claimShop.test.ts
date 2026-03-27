import { describe, it, expect, vi, beforeEach } from 'vitest'
import { claimShop } from './claimShop'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    shop: {
      findUnique: vi.fn(),
    },
    shopClaimRequest: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData()
  formData.append('shopId', overrides.shopId ?? 'shop-1')
  formData.append('businessRole', overrides.businessRole ?? 'Owner')
  formData.append('proofDetail', overrides.proofDetail ?? 'I am the owner of this shop')
  return formData
}

describe('claimShop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(db.shop.findUnique).mockResolvedValue({ ownerId: null } as never)
    vi.mocked(db.shopClaimRequest.findUnique).mockResolvedValue(null)
    vi.mocked(db.shopClaimRequest.create).mockResolvedValue({} as never)
  })

  it('creates a claim successfully', async () => {
    const result = await claimShop({ errors: {} }, makeFormData())
    expect(result.success).toBe(true)
    expect(result.errors).toEqual({})
    expect(db.shopClaimRequest.create).toHaveBeenCalledWith({
      data: { shopId: 'shop-1', userId: 'user-1', businessRole: 'Owner', proofDetail: 'I am the owner of this shop' },
    })
  })

  it('rejects a duplicate PENDING claim with correct message', async () => {
    vi.mocked(db.shopClaimRequest.findUnique).mockResolvedValue({ status: 'PENDING' } as never)
    const result = await claimShop({ errors: {} }, makeFormData())
    expect(result.errors.general).toContain('pending or approved')
    expect(result.success).toBeUndefined()
    expect(db.shopClaimRequest.create).not.toHaveBeenCalled()
  })

  it('rejects a duplicate APPROVED claim with correct message', async () => {
    vi.mocked(db.shopClaimRequest.findUnique).mockResolvedValue({ status: 'APPROVED' } as never)
    const result = await claimShop({ errors: {} }, makeFormData())
    expect(result.errors.general).toContain('pending or approved')
    expect(result.success).toBeUndefined()
  })

  it('rejects a REJECTED claim with contact admin message', async () => {
    vi.mocked(db.shopClaimRequest.findUnique).mockResolvedValue({ status: 'REJECTED' } as never)
    const result = await claimShop({ errors: {} }, makeFormData())
    expect(result.errors.general).toContain('contact an admin')
    expect(result.success).toBeUndefined()
    expect(db.shopClaimRequest.create).not.toHaveBeenCalled()
  })

  it('rejects claim when shop already has an owner', async () => {
    vi.mocked(db.shop.findUnique).mockResolvedValue({ ownerId: 'existing-owner' } as never)
    const result = await claimShop({ errors: {} }, makeFormData())
    expect(result.errors.general).toBe('This shop already has an owner')
    expect(result.success).toBeUndefined()
    expect(db.shopClaimRequest.create).not.toHaveBeenCalled()
  })

  it('returns error when shop is not found', async () => {
    vi.mocked(db.shop.findUnique).mockResolvedValue(null)
    const result = await claimShop({ errors: {} }, makeFormData())
    expect(result.errors.general).toBe('Shop not found')
    expect(result.success).toBeUndefined()
    expect(db.shopClaimRequest.create).not.toHaveBeenCalled()
  })

  it('returns validation error when proofDetail is too short', async () => {
    const formData = makeFormData({ proofDetail: 'short' })
    const result = await claimShop({ errors: {} }, formData)
    expect(result.errors.general).toBeTruthy()
    expect(result.success).toBeUndefined()
    expect(db.shopClaimRequest.create).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated user when requireAuth throws', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))
    const result = await claimShop({ errors: {} }, makeFormData())
    expect(result.errors.general).toBeTruthy()
    expect(result.success).toBeUndefined()
  })
})
