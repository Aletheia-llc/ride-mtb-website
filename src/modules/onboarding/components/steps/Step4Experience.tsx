'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStep } from '@/modules/onboarding/actions/saveStep'
import type { SaveStepState } from '@/modules/onboarding/actions/saveStep'
import { completeOnboarding } from '@/modules/onboarding/actions/completeOnboarding'
import OnboardingShell from '@/modules/onboarding/components/OnboardingShell'

interface Step4ExperienceProps {
  defaultValues: { yearStartedRiding: number | null; favoriteBike: string; favoriteTrail: string }
}

const CURRENT_YEAR = 2026
const TOTAL_STEPS = 5

// Years descending from current year to 1970
const YEAR_OPTIONS: number[] = []
for (let y = CURRENT_YEAR; y >= 1970; y--) {
  YEAR_OPTIONS.push(y)
}

export default function Step4Experience({ defaultValues }: Step4ExperienceProps) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 4),
    { errors: {} }
  )

  const [selectedYear, setSelectedYear] = useState<string>(
    defaultValues.yearStartedRiding ? String(defaultValues.yearStartedRiding) : ''
  )

  const yearsRiding =
    selectedYear ? CURRENT_YEAR - parseInt(selectedYear, 10) : null

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
      onBack={() => router.push('/onboarding/3')}
    >
      <form action={action} className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            Your experience
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Share a bit about your riding history. All fields are optional.
          </p>
        </div>

        {/* Year started riding */}
        <div>
          <label htmlFor="yearStartedRiding" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
            Year you started riding
          </label>
          <select
            id="yearStartedRiding"
            name="yearStartedRiding"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: state.errors.yearStartedRiding
                ? 'var(--color-danger, #ef4444)'
                : 'var(--color-border)',
              color: selectedYear ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            <option value="">Select a year…</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {yearsRiding !== null && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              That&apos;s {yearsRiding === 0 ? 'less than a year' : `${yearsRiding} ${yearsRiding === 1 ? 'year' : 'years'}`} of riding!
            </p>
          )}
          {state.errors.yearStartedRiding && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-danger, #ef4444)' }}>
              {state.errors.yearStartedRiding}
            </p>
          )}
        </div>

        {/* Favourite bike */}
        <div>
          <label htmlFor="favoriteBike" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
            Favourite bike
          </label>
          <input
            id="favoriteBike"
            name="favoriteBike"
            type="text"
            defaultValue={defaultValues.favoriteBike}
            placeholder="e.g. Trek Slash 9"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: state.errors.favoriteBike
                ? 'var(--color-danger, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.favoriteBike && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-danger, #ef4444)' }}>
              {state.errors.favoriteBike}
            </p>
          )}
        </div>

        {/* Favourite trail */}
        <div>
          <label htmlFor="favoriteTrail" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
            Favourite trail
          </label>
          <input
            id="favoriteTrail"
            name="favoriteTrail"
            type="text"
            defaultValue={defaultValues.favoriteTrail}
            placeholder="e.g. A-Line, Whistler"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: state.errors.favoriteTrail
                ? 'var(--color-danger, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.favoriteTrail && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-danger, #ef4444)' }}>
              {state.errors.favoriteTrail}
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
