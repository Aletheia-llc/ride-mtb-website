'use client'

import { useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStep } from '@/modules/onboarding/actions/saveStep'
import type { SaveStepState } from '@/modules/onboarding/actions/saveStep'
import { completeOnboarding } from '@/modules/onboarding/actions/completeOnboarding'
import OnboardingShell from '@/modules/onboarding/components/OnboardingShell'

interface Step1UsernameProps {
  defaultValues: { username: string }
}

const TOTAL_STEPS = 5

export default function Step1Username({ defaultValues }: Step1UsernameProps) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 1),
    { errors: {} }
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/2')
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
      step={1}
      totalSteps={TOTAL_STEPS}
      onSkip={handleSkip}
      onSkipSetup={handleSkipSetup}
    >
      <form action={action}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Choose a username</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            This is how other riders will know you on Ride MTB.
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="username"
            className="block text-sm font-medium mb-1"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            defaultValue={defaultValues.username}
            placeholder="e.g. shredder42"
            autoComplete="username"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: state.errors.username
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.username && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.username}
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
