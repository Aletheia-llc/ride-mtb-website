import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db/client'

vi.mock('@/lib/db/client', () => ({
  db: {
    inviteToken: {
      findUnique: vi.fn(),
    },
  },
}))

import { generateInviteToken, hashToken, validateInvite } from './invites'

beforeEach(() => vi.clearAllMocks())

describe('generateInviteToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateInviteToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns a different token each time', () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken())
  })
})

describe('hashToken', () => {
  it('returns a 64-character sha256 hex hash', () => {
    expect(hashToken('abc123')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same input yields same hash', () => {
    expect(hashToken('abc123')).toBe(hashToken('abc123'))
  })

  it('different inputs yield different hashes', () => {
    expect(hashToken('abc123')).not.toBe(hashToken('xyz789'))
  })
})

describe('validateInvite', () => {
  it('returns null when token not found in DB', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce(null)
    expect(await validateInvite('nonexistent')).toBeNull()
  })

  it('returns null when token is already used', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce({
      id: 'tok-1', tokenHash: hashToken('used-token'), used: true,
      expiresAt: new Date(Date.now() + 86400000),
      createdByAdminId: 'admin-1', claimedByUserId: null, createdAt: new Date(),
    } as never)
    expect(await validateInvite('used-token')).toBeNull()
  })

  it('returns null when token is expired', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce({
      id: 'tok-1', tokenHash: hashToken('expired-token'), used: false,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      createdByAdminId: 'admin-1', claimedByUserId: null, createdAt: new Date(),
    } as never)
    expect(await validateInvite('expired-token')).toBeNull()
  })

  it('returns the token record when valid', async () => {
    const mockToken = {
      id: 'tok-1', tokenHash: hashToken('valid-token'), used: false,
      expiresAt: new Date(Date.now() + 86400000),
      createdByAdminId: 'admin-1', claimedByUserId: null, createdAt: new Date(),
    }
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce(mockToken as never)
    expect(await validateInvite('valid-token')).toBe(mockToken)
  })

  it('queries DB using the hash of the provided token', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce(null)
    await validateInvite('my-raw-token')
    expect(db.inviteToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('my-raw-token') },
    })
  })
})
