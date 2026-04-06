'use server'

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getRecommendations, type SkillLevel } from '@/modules/onboarding/lib/recommendations'
import { grantXP } from '@/modules/xp/lib/engine'

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

    // Welcome XP bonus — idempotent via refId
    void grantXP({
      userId: user.id,
      event: 'event_attended',
      module: 'events',
      refId: `onboarding_complete_${user.id}`,
    })
  }

  return getRecommendations({
    skillLevel: profile.skillLevel as SkillLevel | null,
    interests: profile.interests,
    location: profile.location,
  })
}
