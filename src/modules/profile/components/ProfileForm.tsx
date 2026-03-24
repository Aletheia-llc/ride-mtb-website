'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Input, Button } from '@/ui/components'
import { updateProfile } from '../actions/updateProfile'
import type { UserProfileData } from '../types'
import { AvatarUpload } from './AvatarUpload'

interface ProfileFormProps {
  user: UserProfileData
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    errors: {} as Record<string, string>,
  })

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
        <Input
          label="Location"
          name="location"
          defaultValue={user.location ?? ''}
          placeholder="City, State"
          maxLength={100}
          error={state.errors?.location}
        />

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

        <Input
          label="Years Riding"
          name="yearsRiding"
          type="number"
          min={0}
          max={99}
          defaultValue={user.yearsRiding ?? ''}
          placeholder="e.g., 5"
          error={state.errors?.yearsRiding}
        />
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
