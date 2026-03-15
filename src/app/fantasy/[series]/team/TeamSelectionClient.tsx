// src/app/fantasy/[series]/team/TeamSelectionClient.tsx
'use client'

import { useState } from 'react'
import { TeamPanel } from '@/ui/components/fantasy/TeamPanel'
import { RiderList } from '@/ui/components/fantasy/RiderList'
import { RiderDetail } from '@/ui/components/fantasy/RiderDetail'
import { useLivePrices } from '@/modules/fantasy/hooks/useLivePrices'

interface Rider {
  riderId: string; name: string; nationality: string; gender: 'male' | 'female';
  marketPriceCents: number; basePriceCents: number; isWildcardEligible: boolean; fantasyPoints: number | null;
}

interface Pick {
  riderId: string; name: string; isWildcard: boolean; priceAtPick: number;
}

export function TeamSelectionClient({
  picks: initialPicks,
  riders,
  teamId,
  seriesId,
  season,
  eventId,
  salaryCap,
  deadline,
}: {
  picks: Pick[]; riders: Rider[]; teamId: string | null;
  seriesId: string; season: number; eventId: string; salaryCap: number; deadline: Date;
}) {
  const [picks, setPicks] = useState(initialPicks)
  const [selected, setSelected] = useState<string | null>(null)

  const isLocked = new Date() >= deadline
  const { prices: livePrices, loading: pricesLoading } = useLivePrices(eventId, isLocked)

  const selectedRider = riders.find(r => r.riderId === selected)
  const totalCost = picks.reduce((s, p) => s + p.priceAtPick, 0)
  const teamRiderIds = new Set(picks.map(p => p.riderId))

  const showLiveBadge = !isLocked && !pricesLoading

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
      <TeamPanel
        picks={picks}
        totalCost={totalCost}
        salaryCap={salaryCap}
        teamId={teamId}
        eventId={eventId}
        deadline={deadline}
        isLocked={isLocked}
        onDropped={riderId => setPicks(prev => prev.filter(p => p.riderId !== riderId))}
      />
      <div className="flex flex-col gap-2">
        {showLiveBadge && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium w-fit">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live pricing
          </div>
        )}
        <RiderList
          riders={riders.map(r => ({ ...r, isOnTeam: teamRiderIds.has(r.riderId) }))}
          onSelect={setSelected}
          livePrices={Object.keys(livePrices).length > 0 ? livePrices : undefined}
        />
      </div>
      {selectedRider ? (
        <RiderDetail
          {...selectedRider}
          seriesId={seriesId}
          season={season}
          eventId={eventId}
          isOnTeam={teamRiderIds.has(selectedRider.riderId)}
          onPicked={() => {
            const live = livePrices[selectedRider.riderId]
            const priceAtPick = live?.cents ?? selectedRider.marketPriceCents
            setPicks(prev => [...prev, {
              riderId: selectedRider.riderId,
              name: selectedRider.name,
              isWildcard: selectedRider.isWildcardEligible,
              priceAtPick,
            }])
            setSelected(null)
          }}
        />
      ) : (
        <div className="border border-dashed border-[var(--color-border)] rounded-xl p-6 flex items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">Click a rider to see details</p>
        </div>
      )}
    </div>
  )
}
