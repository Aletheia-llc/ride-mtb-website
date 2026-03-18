'use client'
import Link from 'next/link'
import { useActionState } from 'react'
import { createOrganizerProfile, type OrganizerState } from '@/modules/events/actions/createOrganizerProfile'

export default function OrganizerSetupPage() {
  const [state, formAction, pending] = useActionState<OrganizerState, FormData>(
    createOrganizerProfile,
    { errors: {} },
  )

  if (state.success) return (
    <main className="mx-auto max-w-md px-4 py-8 text-center">
      <p className="text-2xl mb-4">Done!</p>
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">You&apos;re set up!</h1>
      <Link href="/events/organizer" className="text-[var(--color-primary)] underline">Go to your dashboard</Link>
    </main>
  )

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Become an Organizer</h1>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Organization Name</label>
          <input name="name" required maxLength={200} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Bio</label>
          <textarea name="bio" maxLength={1000} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] h-24 resize-none" />
        </div>
        {state.errors.general && <p className="text-sm text-red-500">{state.errors.general}</p>}
        <button type="submit" disabled={pending} className="w-full rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Creating…' : 'Create Profile'}
        </button>
      </form>
    </main>
  )
}
