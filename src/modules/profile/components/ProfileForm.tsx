'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Input, Button } from '@/ui/components'
import { updateProfile } from '../actions/updateProfile'
import type { UserProfileData } from '../types'
import { AvatarUpload } from './AvatarUpload'

interface ProfileFormProps {
  user: UserProfileData
}

const CURRENT_YEAR = 2026

// Years descending from current year to 1970
const YEAR_OPTIONS: number[] = []
for (let y = CURRENT_YEAR; y >= 1970; y--) {
  YEAR_OPTIONS.push(y)
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    errors: {} as Record<string, string>,
  })

  // Zip code state for client-side Mapbox validation
  const [zip, setZip] = useState(user.location ?? '')
  const [resolvedPlace, setResolvedPlace] = useState<string | null>(null)
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipValidating, setZipValidating] = useState(false)

  // Year started riding state for the dynamic "X years" display
  const [selectedYear, setSelectedYear] = useState<string>(
    user.yearStartedRiding ? String(user.yearStartedRiding) : ''
  )
  const yearsRiding = selectedYear ? CURRENT_YEAR - parseInt(selectedYear, 10) : null

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
        const context: Array<{ id: string; text: string }> = feature.context ?? []
        const city = context.find((c) => c.id.startsWith('place'))?.text ?? ''
        const stateCtx = context.find((c) => c.id.startsWith('region'))
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
    <form action={formAction} className="space-y-6">
      {state.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Profile updated successfully.
        </div>
      )}

      {state.errors?.general && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.errors.general}
        </div>
      )}

      {/* Avatar upload — independent of form save */}
      <div className="flex justify-center pb-2">
        <AvatarUpload
          currentAvatarUrl={user.avatarUrl}
          currentImage={user.image}
          displayName={user.name ?? user.username ?? 'User'}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="Display Name"
          name="name"
          defaultValue={user.name ?? ''}
          placeholder="Your name"
          maxLength={100}
          error={state.errors?.name}
        />

        <Input
          label="Username"
          name="username"
          defaultValue={user.username ?? ''}
          placeholder="username"
          maxLength={50}
          error={state.errors?.username}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="bio"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={user.bio ?? ''}
          placeholder="Tell others about yourself..."
          maxLength={500}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        {state.errors?.bio && (
          <p className="text-xs text-red-500">{state.errors.bio}</p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Zip code field with Mapbox validation */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="location"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Zip code <span className="text-[var(--color-text-muted)] font-normal">(US)</span>
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
            className="rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            style={{
              borderColor:
                zipError || state.errors?.location
                  ? '#ef4444'
                  : 'var(--color-border)',
            }}
          />
          {zipValidating && (
            <p className="text-xs text-[var(--color-text-muted)]">Validating…</p>
          )}
          {resolvedPlace && !zipError && (
            <p className="text-xs text-green-600">{resolvedPlace}</p>
          )}
          {(zipError || state.errors?.location) && (
            <p className="text-xs text-red-500">{zipError ?? state.errors?.location}</p>
          )}
        </div>

        <Input
          label="Riding Style"
          name="ridingStyle"
          defaultValue={user.ridingStyle ?? ''}
          placeholder="e.g., Trail, Enduro, XC"
          maxLength={100}
          error={state.errors?.ridingStyle}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="skillLevel"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Skill Level
          </label>
          <select
            id="skillLevel"
            name="skillLevel"
            defaultValue={user.skillLevel ?? ''}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="">Not specified</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
          {state.errors?.skillLevel && (
            <p className="text-xs text-red-500">{state.errors.skillLevel}</p>
          )}
        </div>

        {/* Year started riding — select dropdown */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="yearStartedRiding"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            Year you started riding
          </label>
          <select
            id="yearStartedRiding"
            name="yearStartedRiding"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="">Not specified</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {yearsRiding !== null && (
            <p className="text-xs text-[var(--color-text-muted)]">
              That&apos;s {yearsRiding === 0 ? 'less than a year' : `${yearsRiding} ${yearsRiding === 1 ? 'year' : 'years'}`} of riding!
            </p>
          )}
          {state.errors?.yearStartedRiding && (
            <p className="text-xs text-red-500">{state.errors.yearStartedRiding}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="Favorite Bike"
          name="favoriteBike"
          defaultValue={user.favoriteBike ?? ''}
          placeholder="e.g., Santa Cruz Bronson"
          maxLength={100}
          error={state.errors?.favoriteBike}
        />

        <Input
          label="Favorite Trail"
          name="favoriteTrail"
          defaultValue={user.favoriteTrail ?? ''}
          placeholder="e.g., Whole Enchilada"
          maxLength={100}
          error={state.errors?.favoriteTrail}
        />
      </div>

      <Input
        label="Website URL"
        name="websiteUrl"
        type="url"
        defaultValue={user.websiteUrl ?? ''}
        placeholder="https://example.com"
        maxLength={200}
        error={state.errors?.websiteUrl}
      />

      {/* Email notification preference */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="emailNotifications"
          name="emailNotifications"
          defaultChecked={user.emailNotifications}
          className="mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
        />
        <div>
          <label htmlFor="emailNotifications" className="text-sm font-medium text-[var(--color-text)] cursor-pointer">
            Email me when someone replies to my threads
          </label>
          <p className="text-xs text-[var(--color-text-muted)]">
            Also notifies you when someone mentions you with @username.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/profile"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          Cancel
        </Link>
        <Button type="submit" loading={isPending}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}
