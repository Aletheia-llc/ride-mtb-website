'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const EVENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'race_xc', label: 'XC Race' },
  { value: 'race_enduro', label: 'Enduro' },
  { value: 'race_dh', label: 'DH Race' },
  { value: 'group_ride', label: 'Group Ride' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'trail_work', label: 'Trail Work' },
  { value: 'social', label: 'Social' },
]

export function EventFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <select
        value={searchParams.get('type') ?? ''}
        onChange={(e) => updateParam('type', e.target.value)}
        className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
      >
        {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={searchParams.get('free') === 'true'}
          onChange={(e) => updateParam('free', e.target.checked ? 'true' : '')}
        />
        Free events only
      </label>
    </div>
  )
}
