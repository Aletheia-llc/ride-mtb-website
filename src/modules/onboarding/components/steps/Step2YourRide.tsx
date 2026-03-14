'use client'

import { useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStep } from '@/modules/onboarding/actions/saveStep'
import type { SaveStepState } from '@/modules/onboarding/actions/saveStep'
import { completeOnboarding } from '@/modules/onboarding/actions/completeOnboarding'
import OnboardingShell from '@/modules/onboarding/components/OnboardingShell'

interface Step2YourRideProps {
  defaultValues: { ridingStyle: string | null; skillLevel: string | null }
}

const TOTAL_STEPS = 5

const RIDING_STYLES = [
  { value: 'trail', label: 'Trail' },
  { value: 'enduro', label: 'Enduro' },
  { value: 'downhill', label: 'Downhill' },
  { value: 'xc', label: 'Cross Country' },
  { value: 'flow', label: 'Flow / Jump' },
  { value: 'bikepacking', label: 'Bikepacking' },
]

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
]

export default function Step2YourRide({ defaultValues }: Step2YourRideProps) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 2),
    { errors: {} }
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/3')
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
      step={2}
      totalSteps={TOTAL_STEPS}
      onSkip={handleSkip}
      onSkipSetup={handleSkipSetup}
    >
      <form action={action}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Your ride</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Tell us about how you ride so we can personalise your experience.
          </p>
        </div>

        {/* Riding style */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2">
            Riding style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RIDING_STYLES.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <input
                  type="radio"
                  name="ridingStyle"
                  value={value}
                  defaultChecked={defaultValues.ridingStyle === value}
                  className="accent-current"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                {label}
              </label>
            ))}
          </div>
          {state.errors.ridingStyle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.ridingStyle}
            </p>
          )}
        </div>

        {/* Skill level */}
        <div className="mb-6">
          <label htmlFor="skillLevel" className="block text-sm font-medium mb-2">
            Skill level
          </label>
          <select
            id="skillLevel"
            name="skillLevel"
            defaultValue={defaultValues.skillLevel ?? ''}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: state.errors.skillLevel
                ? 'var(--color-error, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <option value="" disabled>Select your level</option>
            {SKILL_LEVELS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {state.errors.skillLevel && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
              {state.errors.skillLevel}
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
