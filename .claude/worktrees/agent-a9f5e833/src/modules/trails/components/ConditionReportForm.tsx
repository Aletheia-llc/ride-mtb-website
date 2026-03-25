'use client'
import { useActionState } from 'react'
import { reportCondition } from '../actions/reportCondition'

const CONDITIONS = [
  { value: 'HERO_DIRT', label: '🟢 Hero Dirt' },
  { value: 'TACKY', label: '🟢 Tacky' },
  { value: 'DRY', label: '🟡 Dry' },
  { value: 'DUSTY', label: '🟡 Dusty' },
  { value: 'WET', label: '🔵 Wet' },
  { value: 'SOFT', label: '🔵 Soft' },
  { value: 'MUDDY', label: '🟤 Muddy' },
  { value: 'SNOWY', label: '⚪ Snowy' },
  { value: 'ICY', label: '🔴 Icy' },
  { value: 'CLOSED', label: '🔴 Closed' },
]

type ConditionState = { errors: Record<string, string>; success?: boolean }

export function ConditionReportForm({ trailId }: { trailId: string }) {
  const [state, formAction, pending] = useActionState<ConditionState, FormData>(
    reportCondition as (s: ConditionState, f: FormData) => Promise<ConditionState>,
    { errors: {} },
  )

  if (state.success) return <p className="text-sm text-green-600 font-medium">Condition reported! Thanks for the update.</p>

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="trailId" value={trailId} />
      <div className="grid grid-cols-2 gap-2">
        {CONDITIONS.map(c => (
          <label key={c.value} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="condition" value={c.value} required className="accent-[var(--color-primary)]" />
            <span className="text-sm text-[var(--color-text)]">{c.label}</span>
          </label>
        ))}
      </div>
      <textarea name="notes" placeholder="Optional notes…" maxLength={500}
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] h-20 resize-none" />
      {state.errors.general && <p className="text-xs text-red-500">{state.errors.general}</p>}
      <button type="submit" disabled={pending}
        className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Reporting…' : 'Report Condition'}
      </button>
    </form>
  )
}
