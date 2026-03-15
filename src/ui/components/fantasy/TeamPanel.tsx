'use client'

import { BudgetBar } from './BudgetBar'
import { CountdownTimer } from './CountdownTimer'
import { formatPrice } from '@/modules/fantasy/lib/pricing'
import { dropRider } from '@/modules/fantasy/actions/dropRider'

interface Pick {
  riderId: string
  name: string
  isWildcard: boolean
  priceAtPick: number
}

export function TeamPanel({
  picks,
  totalCost,
  salaryCap,
  teamId,
  eventId,
  deadline,
  isLocked,
  onDropped,
}: {
  picks: Pick[]
  totalCost: number
  salaryCap: number
  teamId: string | null
  eventId: string
  deadline: Date
  isLocked: boolean
  onDropped?: (riderId: string) => void
}) {
  async function handleDrop(riderId: string) {
    if (!teamId || isLocked) return
    const result = await dropRider({ teamId, eventId, riderId })
    if (result.success) onDropped?.(riderId)
  }

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-base">Your Team</h2>
        {!isLocked && (
          <div className="text-xs text-[var(--color-text-muted)]">
            Locks in <CountdownTimer deadline={deadline} />
          </div>
        )}
      </div>

      <BudgetBar spent={totalCost} cap={salaryCap} />

      <div className="space-y-2">
        {picks.map(pick => (
          <div key={pick.riderId} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
            <div>
              <p className="text-sm font-medium">{pick.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {pick.isWildcard ? '⭐ Wildcard · ' : ''}{formatPrice(pick.priceAtPick)}
              </p>
            </div>
            {!isLocked && (
              <button onClick={() => handleDrop(pick.riderId)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1">
                Drop
              </button>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 6 - picks.length) }).map((_, i) => (
          <div key={i} className="py-2 border-b border-dashed border-[var(--color-border)] last:border-0">
            <p className="text-xs text-[var(--color-text-muted)]">
              {picks.length + i < 4 ? 'Open slot' : 'Wildcard slot'} —empty—
            </p>
          </div>
        ))}
      </div>

      {picks.length === 6 && (
        <p className="text-xs text-green-600 font-medium text-center">
          ✓ Team complete · {formatPrice(salaryCap - totalCost)} remaining
        </p>
      )}
    </div>
  )
}
