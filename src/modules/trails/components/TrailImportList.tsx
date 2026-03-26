'use client'

import { useState, useTransition } from 'react'

interface PendingSystem {
  id: string
  name: string
  state: string | null
  trailCount: number
  totalMiles: number
  importSource: string
  externalId: string
}

export function TrailImportList({ systems }: { systems: PendingSystem[] }) {
  const [list, setList] = useState(systems)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const publish = (id: string) => {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/trails/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      })
      if (!res.ok) {
        setError('Failed to update status. Please try again.')
        return
      }
      setList(prev => prev.filter(s => s.id !== id))
    })
  }

  if (!list.length) {
    return <p className="text-sm text-[var(--color-text-muted)]">No pending imports.</p>
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {list.map(system => (
        <div
          key={system.id}
          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--color-text)]">{system.name}</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {system.state ?? '—'} · {system.trailCount} trail{system.trailCount !== 1 ? 's' : ''} · {system.totalMiles.toFixed(1)} mi · {system.importSource}
            </p>
          </div>
          <button
            onClick={() => publish(system.id)}
            disabled={isPending}
            className="ml-4 flex-shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            Publish
          </button>
        </div>
      ))}
    </div>
  )
}
