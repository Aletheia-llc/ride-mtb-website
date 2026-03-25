import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

vi.mock('@/lib/auth/guards', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: { inviteToken: { create: vi.fn() } },
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('../lib/invites', () => ({
  generateInviteToken: vi.fn().mockReturnValue('test-raw-token-abc123'),
  hashToken: vi.fn().mockReturnValue('test-hashed-token-xyz'),
}))

import { generateInvite } from './generateInvite'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-user-1' } as any)
  vi.mocked(db.inviteToken.create).mockResolvedValue({
    id: 'invite-1', tokenHash: 'test-hashed-token-xyz', used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByAdminId: 'admin-user-1', claimedByUserId: null, createdAt: new Date(),
  } as any)
})

describe('generateInvite', () => {
  it('creates an InviteToken record with the hash (not the raw token)', async () => {
    await generateInvite({ errors: {} }, new FormData())
    expect(db.inviteToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: 'test-hashed-token-xyz',
          createdByAdminId: 'admin-user-1',
          used: false,
        }),
      })
    )
  })

  it('returns success with invite URL containing the raw token', async () => {
    const result = await generateInvite({ errors: {} }, new FormData())
    expect(result.success).toBe(true)
    expect(result.inviteUrl).toContain('/creators/onboarding?token=test-raw-token-abc123')
  })

  it('throws NEXT_REDIRECT when called by non-admin', async () => {
    vi.mocked(requireAdmin).mockImplementationOnce(() => {
      const err = new Error('NEXT_REDIRECT')
      throw err
    })
    await expect(generateInvite({ errors: {} }, new FormData())).rejects.toThrow('NEXT_REDIRECT')
  })

  it('returns error when DB create fails', async () => {
    vi.mocked(db.inviteToken.create).mockRejectedValueOnce(new Error('DB error'))
    const result = await generateInvite({ errors: {} }, new FormData())
    expect(result.errors.general).toBeDefined()
    expect(result.success).toBeUndefined()
  })
})
