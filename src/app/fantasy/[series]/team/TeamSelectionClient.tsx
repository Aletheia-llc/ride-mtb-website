'use client'

import { useState } from 'react'
import { TeamPanel } from '@/ui/components/fantasy/TeamPanel'
import { RiderList } from '@/ui/components/fantasy/RiderList'
import { RiderDetail } from '@/ui/components/fantasy/RiderDetail'

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

  const selectedRider = riders.find(r => r.riderId === selected)
  const totalCost = picks.reduce((s, p) => s + p.priceAtPick, 0)
  const teamRiderIds = new Set(picks.map(p => p.riderId))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
      <TeamPanel
        picks={picks}
        totalCost={totalCost}
        salaryCap={salaryCap}
        teamId={teamId}
        eventId={eventId}
        deadline={deadline}
        isLocked={false}
        onDropped={riderId => setPicks(prev => prev.filter(p => p.riderId !== riderId))}
      />
      <RiderList
        riders={riders.map(r => ({ ...r, isOnTeam: teamRiderIds.has(r.riderId) }))}
        onSelect={setSelected}
      />
      {selectedRider ? (
        <RiderDetail
          {...selectedRider}
          seriesId={seriesId}
          season={season}
          eventId={eventId}
          isOnTeam={teamRiderIds.has(selectedRider.riderId)}
          onPicked={() => {
            setPicks(prev => [...prev, {
              riderId: selectedRider.riderId,
              name: selectedRider.name,
              isWildcard: selectedRider.isWildcardEligible,
              priceAtPick: selectedRider.marketPriceCents,
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
