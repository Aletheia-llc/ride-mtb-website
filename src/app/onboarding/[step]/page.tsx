import React from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import Step1Username from '@/modules/onboarding/components/steps/Step1Username'
import Step2YourRide from '@/modules/onboarding/components/steps/Step2YourRide'
import Step3AboutYou from '@/modules/onboarding/components/steps/Step3AboutYou'
import Step4Experience from '@/modules/onboarding/components/steps/Step4Experience'
import Step5Interests from '@/modules/onboarding/components/steps/Step5Interests'

interface StepPageProps {
  params: Promise<{ step: string }>
}

export default async function OnboardingStepPage({ params }: StepPageProps) {
  const { step: stepStr } = await params
  const stepNum = parseInt(stepStr, 10)

  if (isNaN(stepNum) || stepNum < 1 || stepNum > 5) {
    redirect('/onboarding')
  }

  const user = await requireAuth()

  if (user.onboardingCompletedAt) {
    redirect('/dashboard')
  }

  const currentStep = user.onboardingStep ?? 1
  if (stepNum !== currentStep) {
    redirect(`/onboarding/${currentStep}`)
  }

  // Fetch DB profile for pre-filling
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      username: true,
      ridingStyle: true,
      skillLevel: true,
      bio: true,
      location: true,
      yearStartedRiding: true,
      favoriteBike: true,
      favoriteTrail: true,
      interests: true,
    },
  })

  const stepComponents: Record<number, React.ReactNode> = {
    1: <Step1Username defaultValues={{ username: profile.username ?? '' }} />,
    2: <Step2YourRide defaultValues={{ ridingStyle: profile.ridingStyle ?? null, skillLevel: profile.skillLevel ?? null }} />,
    3: <Step3AboutYou defaultValues={{ bio: profile.bio ?? '', location: profile.location ?? '' }} />,
    4: <Step4Experience defaultValues={{ yearStartedRiding: profile.yearStartedRiding ?? null, favoriteBike: profile.favoriteBike ?? '', favoriteTrail: profile.favoriteTrail ?? '' }} />,
    5: <Step5Interests defaultValues={{ interests: profile.interests }} />,
  }

  return stepComponents[stepNum]
}
