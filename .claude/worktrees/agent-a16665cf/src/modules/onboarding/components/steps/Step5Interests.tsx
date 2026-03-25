'use client'

import { useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStep } from '@/modules/onboarding/actions/saveStep'
import type { SaveStepState } from '@/modules/onboarding/actions/saveStep'
import { completeOnboarding } from '@/modules/onboarding/actions/completeOnboarding'
import OnboardingShell from '@/modules/onboarding/components/OnboardingShell'

interface Step5InterestsProps {
  defaultValues: { interests: string[] }
}

const TOTAL_STEPS = 5

const INTEREST_OPTIONS = [
  { value: 'forum', label: 'Forum', description: 'Discuss rides, gear, and technique' },
  { value: 'learn', label: 'Learn', description: 'Courses, quizzes, and certificates' },
  { value: 'trails', label: 'Trails', description: 'Find and review trail systems' },
  { value: 'marketplace', label: 'Marketplace', description: 'Buy and sell MTB gear' },
  { value: 'bikes', label: 'Bikes', description: 'Find your perfect bike' },
]

export default function Step5Interests({ defaultValues }: Step5InterestsProps) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 5),
    { errors: {} }
  )

  useEffect(() => {
    if (state.success) {
      completeOnboarding()
        .then(() => router.push('/onboarding/complete'))
        .catch(() => router.push('/onboarding/complete'))
    }
  }, [state.success, router])

  const handleSkip = () => action(new FormData())

  const handleSkipSetup = async () => {
    try {
      await completeOnboarding()
    } catch {}
    router.push('/onboarding/complete')
  }

  return (
    <OnboardingShell
      step={5}
      totalSteps={TOTAL_STEPS}
      onSkip={handleSkip}
      onSkipSetup={handleSkipSetup}
    >
      <form action={action}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">What are you into?</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Select the parts of Ride MTB you&apos;re most excited about. Pick as many as you like.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3">
          {INTEREST_OPTIONS.map(({ value, label, description }) => (
            <label
              key={value}
              className="flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <input
                type="checkbox"
                name="interests"
                value={value}
                defaultChecked={defaultValues.interests.includes(value)}
                className="mt-0.5"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {description}
                </p>
              </div>
            </label>
          ))}
        </div>

        {state.errors.interests && (
          <p className="mb-4 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
            {state.errors.interests}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-lg font-medium text-sm transition-opacity"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Saving...' : 'Finish setup'}
        </button>
      </form>
    </OnboardingShell>
  )
}
