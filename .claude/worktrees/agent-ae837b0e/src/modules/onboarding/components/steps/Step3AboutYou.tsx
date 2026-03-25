'use client'

import { useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStep } from '@/modules/onboarding/actions/saveStep'
import type { SaveStepState } from '@/modules/onboarding/actions/saveStep'
import { completeOnboarding } from '@/modules/onboarding/actions/completeOnboarding'
import OnboardingShell from '@/modules/onboarding/components/OnboardingShell'

interface Step3AboutYouProps {
  defaultValues: { bio: string; location: string }
}

const TOTAL_STEPS = 5

export default function Step3AboutYou({ defaultValues }: Step3AboutYouProps) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 3),
    { errors: {} }
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/4')
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
      step={3}
      totalSteps={TOTAL_STEPS}
      onSkip={handleSkip}
      onSkipSetup={handleSkipSetup}
    >
      <form action={action}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">About you</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Help the community get to know you. Both fields are optional.
          </p>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label htmlFor="bio" className="block text-sm font-medium mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={defaultValues.bio}
            placeholder="Tell riders a bit about yourself…"
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: state.errors.bio
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.bio && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.bio}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="mb-6">
          <label htmlFor="location" className="block text-sm font-medium mb-1">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={defaultValues.location}
            placeholder="e.g. Whistler, BC"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: state.errors.location
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.location && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.location}
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
