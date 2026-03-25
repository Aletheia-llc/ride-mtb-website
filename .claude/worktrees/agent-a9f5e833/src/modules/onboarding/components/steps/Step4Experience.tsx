'use client'

import { useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStep } from '@/modules/onboarding/actions/saveStep'
import type { SaveStepState } from '@/modules/onboarding/actions/saveStep'
import { completeOnboarding } from '@/modules/onboarding/actions/completeOnboarding'
import OnboardingShell from '@/modules/onboarding/components/OnboardingShell'

interface Step4ExperienceProps {
  defaultValues: { yearsRiding: number | null; favoriteBike: string; favoriteTrail: string }
}

const TOTAL_STEPS = 5

export default function Step4Experience({ defaultValues }: Step4ExperienceProps) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 4),
    { errors: {} }
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/5')
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
      step={4}
      totalSteps={TOTAL_STEPS}
      onSkip={handleSkip}
      onSkipSetup={handleSkipSetup}
    >
      <form action={action}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Your experience</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Share a bit about your riding history. All fields are optional.
          </p>
        </div>

        {/* Years riding */}
        <div className="mb-4">
          <label htmlFor="yearsRiding" className="block text-sm font-medium mb-1">
            Years riding
          </label>
          <input
            id="yearsRiding"
            name="yearsRiding"
            type="number"
            min={0}
            max={50}
            defaultValue={defaultValues.yearsRiding ?? ''}
            placeholder="e.g. 5"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: state.errors.yearsRiding
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.yearsRiding && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.yearsRiding}
            </p>
          )}
        </div>

        {/* Favourite bike */}
        <div className="mb-4">
          <label htmlFor="favoriteBike" className="block text-sm font-medium mb-1">
            Favourite bike
          </label>
          <input
            id="favoriteBike"
            name="favoriteBike"
            type="text"
            defaultValue={defaultValues.favoriteBike}
            placeholder="e.g. Trek Slash 9"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: state.errors.favoriteBike
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.favoriteBike && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.favoriteBike}
            </p>
          )}
        </div>

        {/* Favourite trail */}
        <div className="mb-6">
          <label htmlFor="favoriteTrail" className="block text-sm font-medium mb-1">
            Favourite trail
          </label>
          <input
            id="favoriteTrail"
            name="favoriteTrail"
            type="text"
            defaultValue={defaultValues.favoriteTrail}
            placeholder="e.g. A-Line, Whistler"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: state.errors.favoriteTrail
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.favoriteTrail && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.favoriteTrail}
            </p>
          )}
        </div>

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
          {isPending ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </OnboardingShell>
  )
}
