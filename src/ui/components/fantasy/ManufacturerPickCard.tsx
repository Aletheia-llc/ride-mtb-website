'use client'

import { useActionState } from 'react'
import { pickManufacturer } from '@/modules/fantasy/actions/pickManufacturer'
import type { PickManufacturerState } from '@/modules/fantasy/actions/pickManufacturer'
import type { ManufacturerPickWithTotal } from '@/modules/fantasy/queries/getManufacturerPick'
import Image from 'next/image'

interface Props {
  seriesId: string
  season: number
  currentPick: ManufacturerPickWithTotal | null
  manufacturers: { id: string; name: string; slug: string; logoUrl: string | null }[]
  /** true if Round 1 rosterDeadline has passed */
  pickWindowClosed: boolean
}

export function ManufacturerPickCard({ seriesId, season, currentPick, manufacturers, pickWindowClosed }: Props) {
  const [state, formAction, pending] = useActionState<PickManufacturerState, FormData>(
    pickManufacturer,
    {}
  )

  const isLocked = currentPick?.lockedAt != null || pickWindowClosed

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Manufacturer Cup Pick</h2>
        {isLocked && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Locked</span>
        )}
        {!isLocked && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Open</span>
        )}
      </div>

      {currentPick ? (
        <div className="flex items-center gap-3">
          {currentPick.manufacturer.logoUrl && (
            <Image
              src={currentPick.manufacturer.logoUrl}
              alt={currentPick.manufacturer.name}
              width={32}
              height={32}
              className="rounded"
              unoptimized
            />
          )}
          <div>
            <p className="font-medium">{currentPick.manufacturer.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {currentPick.seasonTotal} pts this season
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">No manufacturer selected yet.</p>
      )}

      {!isLocked && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="seriesId" value={seriesId} />
          <input type="hidden" name="season" value={season} />
          <div className="flex gap-2">
            <select
              name="manufacturerId"
              defaultValue={currentPick?.manufacturerId ?? ''}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">— Choose a manufacturer —</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition"
            >
              {pending ? 'Saving...' : currentPick ? 'Change' : 'Pick'}
            </button>
          </div>
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">
            Locks at the Round 1 roster deadline. No mid-season changes.
          </p>
        </form>
      )}
    </div>
  )
}
