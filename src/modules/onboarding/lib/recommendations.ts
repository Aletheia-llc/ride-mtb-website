import { db } from '@/lib/db/client'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

const SKILL_TO_DIFFICULTY: Record<SkillLevel, 'beginner' | 'intermediate' | 'advanced'> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  expert: 'advanced',
}

const INTEREST_TO_SLUG: Record<string, string> = {
  Forum: 'general-discussion',
  Learn: 'education',
  Trails: 'trails',
  Marketplace: 'marketplace',
  Bikes: 'bikes',
}

interface RecommendationInput {
  skillLevel: SkillLevel | null
  interests: string[]
  location: string | null
}

export async function getRecommendations(user: RecommendationInput) {
  // Course recommendation
  let course = null
  if (user.skillLevel) {
    const difficulty = SKILL_TO_DIFFICULTY[user.skillLevel]
    course = await db.learnCourse.findFirst({
      where: { difficulty, status: 'published' },
      orderBy: { createdAt: 'asc' },
    })
  }
  if (!course) {
    course = await db.learnCourse.findFirst({
      where: { status: 'published' },
      orderBy: { createdAt: 'asc' },
    })
  }

  // Community recommendation
  const firstInterest = user.interests[0]
  const communitySlug = firstInterest ? (INTEREST_TO_SLUG[firstInterest] ?? 'general-discussion') : 'general-discussion'
  const community = await db.category.findFirst({
    where: { slug: communitySlug },
  })

  // Trail recommendation
  let trail = null
  if (user.location) {
    const city = user.location.split(',')[0].trim()
    trail = await db.trailSystem.findFirst({
      where: { city },
    })
  }
  if (!trail) {
    trail = await db.trailSystem.findFirst({
      orderBy: { trailCount: 'desc' },
    })
  }

  return { course, community, trail }
}
