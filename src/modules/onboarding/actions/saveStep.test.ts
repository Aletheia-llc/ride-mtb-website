import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { saveStep } from './saveStep'

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123' } as any)
  vi.mocked(db.user.findUnique).mockResolvedValue(null)
  vi.mocked(db.user.update).mockResolvedValue({} as any)
})

describe('saveStep', () => {
  // ── Step 1: Username ─────────────────────────────────────────────────────

  it('step 1: saves username and advances onboardingStep to 2', async () => {
    const formData = new FormData()
    formData.append('username', 'riderKyle')

    const result = await saveStep(1, { errors: {} }, formData)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { username: 'riderKyle', onboardingStep: 2 },
    })
  })

  it('step 1: returns error when username is already taken by another user', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: 'other-user' } as any)
    const formData = new FormData()
    formData.append('username', 'takenname')

    const result = await saveStep(1, { errors: {} }, formData)

    expect(result.errors.username).toBe('Username already taken')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('step 1: skip (empty FormData) advances onboardingStep to 2 without saving username', async () => {
    const result = await saveStep(1, { errors: {} }, new FormData())

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { onboardingStep: 2 },
    })
    const callData = vi.mocked(db.user.update).mock.calls[0][0].data
    expect(callData).not.toHaveProperty('username')
  })

  it('step 1: returns error for username that is too short', async () => {
    const formData = new FormData()
    formData.append('username', 'ab')

    const result = await saveStep(1, { errors: {} }, formData)

    expect(result.errors.username).toBeDefined()
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('step 1: does not check uniqueness if current user owns the username', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: 'user-123' } as any)
    const formData = new FormData()
    formData.append('username', 'myownname')

    const result = await saveStep(1, { errors: {} }, formData)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalled()
  })

  // ── Step 2: Riding Style + Skill Level ───────────────────────────────────

  it('step 2: saves ridingStyle and skillLevel, advances to step 3', async () => {
    const formData = new FormData()
    formData.append('ridingStyle', 'enduro')
    formData.append('skillLevel', 'intermediate')

    const result = await saveStep(2, { errors: {} }, formData)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { ridingStyle: 'enduro', skillLevel: 'intermediate', onboardingStep: 3 },
    })
  })

  it('step 2: returns error for invalid skillLevel', async () => {
    const formData = new FormData()
    formData.append('ridingStyle', 'trail')
    formData.append('skillLevel', 'wizard')

    const result = await saveStep(2, { errors: {} }, formData)

    expect(result.errors.skillLevel).toBeDefined()
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('step 2: skip (empty FormData) advances to step 3 without saving data', async () => {
    const result = await saveStep(2, { errors: {} }, new FormData())

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { onboardingStep: 3 },
    })
  })

  // ── Step 3: Bio + Location ───────────────────────────────────────────────

  it('step 3: saves bio and zip code location, advances to step 4', async () => {
    const formData = new FormData()
    formData.append('bio', 'I love shredding trails')
    formData.append('location', '98225')

    const result = await saveStep(3, { errors: {} }, formData)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { bio: 'I love shredding trails', location: '98225', onboardingStep: 4 },
    })
  })

  it('step 3: skip (empty FormData) advances to step 4 without saving data', async () => {
    const result = await saveStep(3, { errors: {} }, new FormData())

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { onboardingStep: 4 },
    })
  })

  // ── Step 4: Year Started Riding + Favorite Bike + Favorite Trail ────────

  it('step 4: saves yearStartedRiding, favoriteBike, favoriteTrail, advances to step 5', async () => {
    const formData = new FormData()
    formData.append('yearStartedRiding', '2015')
    formData.append('favoriteBike', 'Trek Slash')
    formData.append('favoriteTrail', 'Holy Roller')

    const result = await saveStep(4, { errors: {} }, formData)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { yearStartedRiding: 2015, favoriteBike: 'Trek Slash', favoriteTrail: 'Holy Roller', onboardingStep: 5 },
    })
  })

  it('step 4: skip (empty FormData) advances to step 5 without saving data', async () => {
    const result = await saveStep(4, { errors: {} }, new FormData())

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { onboardingStep: 5 },
    })
  })

  // ── Step 5: Interests ────────────────────────────────────────────────────

  it('step 5: saves interests array and advances to step 6', async () => {
    const formData = new FormData()
    formData.append('interests', 'Forum')
    formData.append('interests', 'Trails')
    formData.append('interests', 'Learn')

    const result = await saveStep(5, { errors: {} }, formData)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { interests: ['Forum', 'Trails', 'Learn'], onboardingStep: 6 },
    })
  })

  it('step 5: skip (empty FormData) advances to step 6 without saving data', async () => {
    const result = await saveStep(5, { errors: {} }, new FormData())

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { onboardingStep: 6 },
    })
  })
})
