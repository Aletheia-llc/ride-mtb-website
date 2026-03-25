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
    try { await completeOnboarding() } catch {}
    router.push('/onboarding/complete')
  }

  return (
    <OnboardingShell
      step={1}
      totalSteps={TOTAL_STEPS}
      onSkip={handleSkip}
      onSkipSetup={handleSkipSetup}
      // No back button on step 1
    >
      <form action={action} className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            Choose a username
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            This is how other riders will know you on Ride MTB.
          </p>
        </div>

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
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
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: state.errors.username
                ? 'var(--color-danger, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.username && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-danger, #ef4444)' }}>
              {state.errors.username}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </OnboardingShell>
  )
}
