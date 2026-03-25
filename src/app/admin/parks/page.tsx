'use client'

import { useTransition, useState, useEffect } from 'react'
import Link from 'next/link'
import { syncFacilitiesFromOSM, getSyncState } from '@/modules/parks/actions/sync'
import { Loader2 } from 'lucide-react'
import type { Prisma } from '@/generated/prisma/client'

export default function AdminParksPage() {
  const [syncState, setSyncState] = useState<{
    syncInProgress: boolean
    lastSyncedAt: Date | null
    lastSyncResult: Prisma.JsonValue
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ added: number; updated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSyncState().then(setSyncState)
  }, [])

  const handleSync = () => {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await syncFacilitiesFromOSM()
        setResult(res)
        const updated = await getSyncState()
        setSyncState(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed')
        const updated = await getSyncState()
        setSyncState(updated)
      }
    })
  }

  const isRunning = isPending || syncState?.syncInProgress

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Parks & Facilities</h1>

      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">OSM Sync</h2>

        {syncState?.lastSyncedAt && (
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Last synced: {new Date(syncState.lastSyncedAt).toLocaleString('en-US')}
          </p>
        )}

        <button
          onClick={handleSync}
          disabled={!!isRunning || syncState === null}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
          {isRunning ? 'Syncing...' : 'Sync from OSM'}
        </button>

        {result && (
          <p className="mt-3 text-sm text-green-600">
            Sync complete — {result.added} added, {result.updated} updated.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Photo Moderation</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Review and approve user-submitted photos.
        </p>
        <Link
          href="/admin/parks/photos"
          className="inline-block rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        >
          View Photo Queue →
        </Link>
      </div>
    </div>
  )
}
