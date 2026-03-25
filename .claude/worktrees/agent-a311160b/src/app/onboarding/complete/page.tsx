import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import WelcomeCard from '@/modules/onboarding/components/WelcomeCard'

export default async function OnboardingCompletePage() {
  const user = await requireAuth()

  // DB-based guard (not session — avoids stale session race condition)
  const profile = await db.user.findUniqueOrThrow({ where: { id: user.id } })

  if (!profile.onboardingCompletedAt) {
    redirect('/onboarding')
  }

  // Recommendations computed client-side via completeOnboarding action
  // WelcomeCard receives no recommendations here — they come from the action
  return <WelcomeCard />
}
