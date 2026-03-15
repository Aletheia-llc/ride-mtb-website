'use client'

import { useActionState } from 'react'
import { ensureChampionshipLeague } from '@/modules/fantasy/actions/admin/manageSeries'
import type { EnsureChampionshipLeagueState } from '@/modules/fantasy/actions/admin/manageSeries'
import { Card } from '@/ui/components'

interface ChampionshipLeagueFormProps {
  seriesId: string
  season: number
  exists: boolean
}

export function ChampionshipLeagueForm({ seriesId, season, exists }: ChampionshipLeagueFormProps) {
  const [state, formAction, pending] = useActionState<EnsureChampionshipLeagueState, FormData>(
    ensureChampionshipLeague,
    { errors: {} },
  )

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Championship League</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        {exists
          ? 'A championship league already exists for this series and season.'
          : 'No championship league found. Use this to create one manually if the Stripe webhook missed it.'}
      </p>

      {state.errors?.general && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {state.errors.general}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">
          Championship league ensured successfully.
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="seriesId" value={seriesId} />
        <input type="hidden" name="season" value={season} />
        <button
          type="submit"
          disabled={pending || (exists && !state.success)}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 transition-colors"
        >
          {pending ? 'Creating...' : exists ? 'League Already Exists' : 'Ensure Championship League'}
        </button>
      </form>
    </Card>
  )
}
