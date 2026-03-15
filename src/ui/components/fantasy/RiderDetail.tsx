'use client'

import { formatPrice } from '@/modules/fantasy/lib/pricing'
import { pickRider } from '@/modules/fantasy/actions/pickRider'
import { useState } from 'react'

interface Props {
  riderId: string
  name: string
  nationality: string
  marketPriceCents: number
  basePriceCents: number
  isWildcardEligible: boolean
  fantasyPoints: number | null
  isOnTeam: boolean
  seriesId: string
  season: number
  eventId: string
  onPicked?: () => void
}

export function RiderDetail(props: Props) {
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')

  async function handlePick() {
    setPicking(true)
    setError('')
    const result = await pickRider({
      seriesId: props.seriesId,
      season: props.season,
      eventId: props.eventId,
      riderId: props.riderId,
    })
    if (!result.success) setError(result.error ?? 'Failed to pick')
    else props.onPicked?.()
    setPicking(false)
  }

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div>
        <h3 className="font-bold text-lg">{props.name}</h3>
        <p className="text-sm text-[var(--color-text-muted)]">{props.nationality}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Market Price</p>
          <p className="font-bold">{formatPrice(props.marketPriceCents)}</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Base Price</p>
          <p className="font-bold">{formatPrice(props.basePriceCents)}</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Fantasy Pts (last)</p>
          <p className="font-bold">{props.fantasyPoints ?? '—'}</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Slot Type</p>
          <p className="font-bold">{props.isWildcardEligible ? '⭐ Wildcard' : 'Open'}</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!props.isOnTeam ? (
        <button onClick={handlePick} disabled={picking}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-medium text-sm disabled:opacity-50">
          {picking ? 'Picking...' : `Pick ${props.name}`}
        </button>
      ) : (
        <p className="text-center text-green-600 text-sm font-medium">✓ On your team</p>
      )}
    </div>
  )
}
