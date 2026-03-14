import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { saveCreatorProfile } from './saveCreatorProfile'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123' } as any)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({
    id: 'profile-1', userId: 'user-123', displayName: 'Old Name', status: 'onboarding',
  } as any)
  vi.mocked(db.creatorProfile.update).mockResolvedValue({} as any)
})

describe('saveCreatorProfile', () => {
  it('saves displayName and returns success', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', licensingAttested: 'true' }),
    )
    expect(result.success).toBe(true)
    expect(db.creatorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        data: expect.objectContaining({ displayName: 'Kyle Warner' }),
      })
    )
  })

  it('sets licensingAttestedAt when attestation checkbox is checked', async () => {
    await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', licensingAttested: 'true' }),
    )
    const call = vi.mocked(db.creatorProfile.update).mock.calls[0][0]
    expect(call.data.licensingAttestedAt).toBeInstanceOf(Date)
  })

  it('returns error when displayName is missing', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ licensingAttested: 'true' }),
    )
    expect(result.errors.displayName).toBeDefined()
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })

  it('returns error when displayName is too short', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'A', licensingAttested: 'true' }),
    )
    expect(result.errors.displayName).toBeDefined()
  })

  it('returns error when licensing attestation is not checked', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner' }),
    )
    expect(result.errors.licensingAttested).toBeDefined()
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })

  it('saves optional bio when provided', async () => {
    await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', bio: 'I ride trails', licensingAttested: 'true' }),
    )
    const call = vi.mocked(db.creatorProfile.update).mock.calls[0][0]
    expect(call.data.bio).toBe('I ride trails')
  })

  it('returns error when creator profile not found', async () => {
    vi.mocked(db.creatorProfile.findUnique).mockResolvedValueOnce(null)
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', licensingAttested: 'true' }),
    )
    expect(result.errors.general).toBeDefined()
  })
})
