'use client'
import { useActionState } from 'react'
import { applyToCoachAction, type ApplyState } from '@/modules/coaching/actions/applyToCoach'

interface CoachApplicationFormProps {
  existing?: { title: string; bio: string; specialties: unknown; hourlyRate: number | null; location: string | null; calcomLink: string | null } | null
}

export function CoachApplicationForm({ existing }: CoachApplicationFormProps) {
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(applyToCoachAction, { errors: null })

  const specialties = (existing?.specialties as string[] | null)?.join(', ') ?? ''

  return (
    <form action={formAction} className="space-y-5">
      {state.errors && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.errors}</div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Coaching Title *</label>
        <input name="title" defaultValue={existing?.title} required className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="e.g. Enduro & Downhill Specialist" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Bio * <span className="text-[var(--color-text-muted)] font-normal">(min. 50 characters)</span></label>
        <textarea name="bio" defaultValue={existing?.bio} required rows={6} className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="Describe your riding background, coaching experience, and teaching style..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Specialties</label>
          <input name="specialties" defaultValue={specialties} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="Downhill, Enduro, Jumps (comma-separated)" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Hourly Rate (USD)</label>
          <input name="hourlyRate" type="number" min="0" step="5" defaultValue={existing?.hourlyRate ?? ''} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="e.g. 75" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Location</label>
          <input name="location" defaultValue={existing?.location ?? ''} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="City, State or Remote" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Cal.com Link</label>
          <input name="calcomLink" defaultValue={existing?.calcomLink ?? ''} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="https://cal.com/yourname/session" />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60">
          {pending ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    </form>
  )
}
