import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db/client'
import { getRecommendations } from './recommendations'

vi.mock('@/lib/db/client', () => ({
  db: {
    learnCourse: { findFirst: vi.fn() },
    forumCategory: { findFirst: vi.fn() },
    trailSystem: { findFirst: vi.fn() },
  },
}))

const mockLearnCourse = vi.mocked(db.learnCourse.findFirst)
const mockForumCategory = vi.mocked(db.forumCategory.findFirst)
const mockTrailSystem = vi.mocked(db.trailSystem.findFirst)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getRecommendations', () => {
  it('returns course matching skill level (beginner → beginner difficulty)', async () => {
    const course = { id: '1', title: 'Beginner Basics', slug: 'beginner-basics' }
    mockLearnCourse.mockResolvedValueOnce(course as any)
    mockForumCategory.mockResolvedValueOnce({ id: '2', slug: 'general-discussion', name: 'General' } as any)
    mockTrailSystem.mockResolvedValueOnce({ id: '3', name: 'Local Trails', slug: 'local' } as any)

    const result = await getRecommendations({ skillLevel: 'beginner', interests: [], location: null })

    expect(mockLearnCourse).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ difficulty: 'beginner' }) })
    )
    expect(result.course).toEqual(course)
  })

  it('maps expert skillLevel to advanced difficulty', async () => {
    const course = { id: '1', title: 'Expert Course', slug: 'expert-course' }
    mockLearnCourse.mockResolvedValueOnce(course as any)
    mockForumCategory.mockResolvedValueOnce({ id: '2', slug: 'general-discussion', name: 'General' } as any)
    mockTrailSystem.mockResolvedValueOnce({ id: '3', name: 'Trails', slug: 'trails' } as any)

    await getRecommendations({ skillLevel: 'expert', interests: [], location: null })

    expect(mockLearnCourse).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ difficulty: 'advanced' }) })
    )
  })

  it('falls back to first published course when no skill-level match', async () => {
    mockLearnCourse
      .mockResolvedValueOnce(null) // no match for beginner
      .mockResolvedValueOnce({ id: '99', title: 'Fallback Course', slug: 'fallback' } as any)
    mockForumCategory.mockResolvedValueOnce({ id: '2', slug: 'general-discussion', name: 'General' } as any)
    mockTrailSystem.mockResolvedValueOnce({ id: '3', name: 'Trails', slug: 'trails' } as any)

    const result = await getRecommendations({ skillLevel: 'beginner', interests: [], location: null })

    expect(mockLearnCourse).toHaveBeenCalledTimes(2)
    expect(result.course).toMatchObject({ id: '99' })
  })

  it('maps first interest to community slug (Forum → general-discussion)', async () => {
    mockLearnCourse.mockResolvedValueOnce({ id: '1', title: 'Course', slug: 'course' } as any)
    const category = { id: '2', slug: 'general-discussion', name: 'General' }
    mockForumCategory.mockResolvedValueOnce(category as any)
    mockTrailSystem.mockResolvedValueOnce({ id: '3', name: 'Trails', slug: 'trails' } as any)

    const result = await getRecommendations({ skillLevel: null, interests: ['Forum'], location: null })

    expect(mockForumCategory).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ slug: 'general-discussion' }) })
    )
    expect(result.community).toEqual(category)
  })

  it('falls back to general-discussion when no interests', async () => {
    mockLearnCourse.mockResolvedValueOnce({ id: '1', title: 'Course', slug: 'course' } as any)
    mockForumCategory.mockResolvedValueOnce({ id: '2', slug: 'general-discussion', name: 'General' } as any)
    mockTrailSystem.mockResolvedValueOnce({ id: '3', name: 'Trails', slug: 'trails' } as any)

    await getRecommendations({ skillLevel: null, interests: [], location: null })

    expect(mockForumCategory).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ slug: 'general-discussion' }) })
    )
  })

  it('queries trail by location when set', async () => {
    mockLearnCourse.mockResolvedValueOnce({ id: '1', title: 'Course', slug: 'course' } as any)
    mockForumCategory.mockResolvedValueOnce({ id: '2', slug: 'general-discussion', name: 'General' } as any)
    const trail = { id: '3', name: 'Moab Trails', slug: 'moab' }
    mockTrailSystem.mockResolvedValueOnce(trail as any)

    const result = await getRecommendations({ skillLevel: null, interests: [], location: 'Moab, UT' })

    expect(mockTrailSystem).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ city: expect.stringContaining('Moab') }) })
    )
    expect(result.trail).toEqual(trail)
  })

  it('falls back to highest trailCount trail when no location', async () => {
    mockLearnCourse.mockResolvedValueOnce({ id: '1', title: 'Course', slug: 'course' } as any)
    mockForumCategory.mockResolvedValueOnce({ id: '2', slug: 'general-discussion', name: 'General' } as any)
    const trail = { id: '3', name: 'Popular Trails', slug: 'popular' }
    mockTrailSystem.mockResolvedValueOnce(trail as any)

    const result = await getRecommendations({ skillLevel: null, interests: [], location: null })

    expect(mockTrailSystem).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expect.objectContaining({ trailCount: 'desc' }) })
    )
    expect(result.trail).toEqual(trail)
  })
})
