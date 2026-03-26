'use client'
import Image from 'next/image'
import { useActionState } from 'react'
import { addBuildLogEntry } from '../actions/addBuildLogEntry'

type Entry = { id: string; title: string; description: string | null; imageUrl: string | null; entryDate: Date }
type BuildLogState = { errors: Record<string, string>; success?: boolean }

export function BuildLogTimeline({ bikeId, entries }: { bikeId: string; entries: Entry[] }) {
  const [state, formAction, pending] = useActionState<BuildLogState, FormData>(
    addBuildLogEntry as (s: BuildLogState, f: FormData) => Promise<BuildLogState>,
    { errors: {} },
  )

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative pl-6 space-y-4">
        {entries.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No build log entries yet.</p>}
        {entries.map((entry, i) => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-[var(--color-primary)] border-2 border-[var(--color-bg)]" />
            {i < entries.length - 1 && <div className="absolute -left-[19px] top-4 bottom-0 w-px bg-[var(--color-border)]" />}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-[var(--color-text)]">{entry.title}</p>
                <span className="text-xs text-[var(--color-text-muted)]">{new Date(entry.entryDate).toLocaleDateString()}</span>
              </div>
              {entry.description && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{entry.description}</p>}
              {entry.imageUrl && <Image src={entry.imageUrl} alt={entry.title} width={400} height={128} className="mt-2 rounded h-32 object-cover" unoptimized />}
            </div>
          </div>
        ))}
      </div>

      {/* Add entry form */}
      <details className="rounded-lg border border-[var(--color-border)]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--color-text)] select-none">+ Add Build Log Entry</summary>
        <form action={formAction} className="px-4 pb-4 space-y-3">
          <input type="hidden" name="bikeId" value={bikeId} />
          <input name="title" placeholder="Entry title (e.g. 'Upgraded fork')" required maxLength={200}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]" />
          <textarea name="description" placeholder="Details…" maxLength={2000}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] h-20 resize-none" />
          {state.errors.general && <p className="text-xs text-red-500">{state.errors.general}</p>}
          <button type="submit" disabled={pending} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Adding…' : 'Add Entry'}
          </button>
        </form>
      </details>
    </div>
  )
}
