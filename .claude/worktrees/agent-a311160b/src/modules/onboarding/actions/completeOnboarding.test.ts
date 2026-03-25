import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getRecommendations } from '@/modules/onboarding/lib/recommendations'
import { completeOnboarding } from './completeOnboarding'

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/db/client', () => ({
  db: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/modules/onboarding/lib/recommendations', () => ({
  getRecommendations: vi.fn(),
}))

const mockUser = { id: 'user-123' }
const mockProfile = {
  id: 'user-123',
  skillLevel: 'beginner' as const,
  interests: ['Forum'],
  location: 'Moab, UT',
  onboardingCompletedAt: null,
}
const mockRecommendations = {
  course: { id: '1', title: 'Beginner Course', slug: 'beginner' },
  community: { id: '2', slug: 'general-discussion', name: 'General' },
  trail: { id: '3', name: 'Moab Trails', slug: 'moab' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(mockUser as any)
  vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue(mockProfile as any)
  vi.mocked(db.user.update).mockResolvedValue({} as any)
  vi.mocked(getRecommendations).mockResolvedValue(mockRecommendations as any)
})

describe('completeOnboarding', () => {
  it('sets onboardingCompletedAt when not already set', async () => {
    await completeOnboarding()

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { onboardingCompletedAt: expect.any(Date) },
    })
  })

  it('does NOT update onboardingCompletedAt if already set (idempotent)', async () => {
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValueOnce({
      ...mockProfile,
      onboardingCompletedAt: new Date('2024-01-01'),
    } as any)

    await completeOnboarding()

    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('returns recommendations from getRecommendations', async () => {
    const result = await completeOnboarding()

    expect(result).toEqual(mockRecommendations)
  })

  it('calls getRecommendations with user profile fields', async () => {
    await completeOnboarding()

    expect(getRecommendations).toHaveBeenCalledWith({
      skillLevel: 'beginner',
      interests: ['Forum'],
      location: 'Moab, UT',
    })
  })
})
