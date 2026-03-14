import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'

export default async function OnboardingIndexPage() {
  const user = await requireAuth()
  if (user.onboardingCompletedAt) {
    redirect('/dashboard')
  }
  redirect(`/onboarding/${user.onboardingStep ?? 1}`)
}
