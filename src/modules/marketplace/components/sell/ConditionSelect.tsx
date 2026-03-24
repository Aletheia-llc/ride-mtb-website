'use client'

import type { ItemCondition } from '@/modules/marketplace/types'

const CONDITION_OPTIONS: {
  value: ItemCondition
  label: string
}[] = [
  {
    value: 'new',
    label: 'New \u2014 sealed, never used',
  },
  {
    value: 'like_new',
    label: 'Like New \u2014 barely used, no visible wear',
  },
  {
    value: 'good',
    label: 'Good \u2014 normal wear, fully functional',
  },
  {
    value: 'fair',
    label: 'Fair \u2014 noticeable wear, works but shows age',
  },
  {
    value: 'poor',
    label: 'Poor / Parts Only \u2014 for parts or project bikes',
  },
]

type ConditionSelectProps = {
  value: string
  onChange: (value: string) => void
}

export function ConditionSelect({ value, onChange }: ConditionSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="listing-condition"
        className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
      >
        Condition <span className="text-red-500">*</span>
      </label>
      <select
        id="listing-condition"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]"
      >
        <option value="" disabled>
          Select condition...
        </option>
        {CONDITION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
