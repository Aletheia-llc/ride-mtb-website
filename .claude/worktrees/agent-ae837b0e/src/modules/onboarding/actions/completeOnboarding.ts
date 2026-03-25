'use server'

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getRecommendations, type SkillLevel } from '@/modules/onboarding/lib/recommendations'

export async function completeOnboarding() {
  const user = await requireAuth()

  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      onboardingCompletedAt: true,
      skillLevel: true,
      interests: true,
      location: true,
    },
  })

  if (!profile.onboardingCompletedAt) {
    await db.user.update({
      where: { id: user.id },
      data: { onboardingCompletedAt: new Date() },
    })
  }

  return getRecommendations({
    skillLevel: profile.skillLevel as SkillLevel | null,
    interests: profile.interests,
    location: profile.location,
  })
}
