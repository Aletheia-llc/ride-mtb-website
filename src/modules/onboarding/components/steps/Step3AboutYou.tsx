'use client'

import { useEffect, useState } from 'react'
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

  // Zip code state for client-side Mapbox validation
  const [zip, setZip] = useState(defaultValues.location ?? '')
  const [resolvedPlace, setResolvedPlace] = useState<string | null>(null)
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipValidating, setZipValidating] = useState(false)

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

  async function validateZip(value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      setZipError(null)
      setResolvedPlace(null)
      return
    }
    if (!/^\d{5}$/.test(trimmed)) {
      setZipError('Please enter a valid US zip code')
      setResolvedPlace(null)
      return
    }
    setZipValidating(true)
    setZipError(null)
    setResolvedPlace(null)
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${trimmed}.json?country=US&types=postcode&access_token=${token}`
      )
      if (!res.ok) throw new Error('Geocoding request failed')
      const json = await res.json()
      const feature = json.features?.[0]
      if (!feature) {
        setZipError('Please enter a valid US zip code')
      } else {
        // feature.place_name is e.g. "10001, New York, New York, United States"
        // context array has city (place) and state (region)
        const context: Array<{ id: string; text: string }> = feature.context ?? []
        const city = context.find((c) => c.id.startsWith('place'))?.text ?? ''
        const stateCtx = context.find((c) => c.id.startsWith('region'))
        // Some responses encode state as short_code "US-WA" → strip "US-"
        const stateCode = stateCtx?.text ?? ''
        const label = city && stateCode ? `${city}, ${stateCode}` : feature.place_name
        setResolvedPlace(label)
      }
    } catch {
      setZipError('Could not validate zip code. Please try again.')
    } finally {
      setZipValidating(false)
    }
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={TOTAL_STEPS}
      onSkip={handleSkip}
      onSkipSetup={handleSkipSetup}
      onBack={() => router.push('/onboarding/2')}
    >
      <form action={action} className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            About you
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Help the community get to know you. Both fields are optional.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            defaultValue={defaultValues.bio}
            placeholder="Tell riders a bit about yourself…"
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none outline-none"
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: state.errors.bio
                ? 'var(--color-danger, #ef4444)'
                : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {state.errors.bio && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-danger, #ef4444)' }}>
              {state.errors.bio}
            </p>
          )}
        </div>

        {/* Zip code */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
            Zip code <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(US)</span>
          </label>
          <input
            id="location"
            name="location"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => {
              setZip(e.target.value)
              setZipError(null)
              setResolvedPlace(null)
            }}
            onBlur={() => validateZip(zip)}
            placeholder="e.g. 98225"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor:
                zipError || state.errors.location
                  ? 'var(--color-danger, #ef4444)'
                  : 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          {zipValidating && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Validating…
            </p>
          )}
          {resolvedPlace && !zipError && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-success, #22c55e)' }}>
              {resolvedPlace}
            </p>
          )}
          {(zipError || state.errors.location) && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-danger, #ef4444)' }}>
              {zipError ?? state.errors.location}
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
