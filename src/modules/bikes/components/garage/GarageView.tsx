'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bike, BarChart2, GitCompare } from 'lucide-react'
import { Button, EmptyState } from '@/ui/components'
import type { UserBikeData } from '../../types/garage'
import { BikeCard } from './BikeCard'

interface GarageViewProps {
  bikes: UserBikeData[]
}

export function GarageView({ bikes }: GarageViewProps) {
  const router = useRouter()
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev // cap at 3
      return [...prev, id]
    })
  }

  const handleCompare = () => {
    if (selectedIds.length >= 2) {
      router.push(`/bikes/garage/compare?bikes=${selectedIds.join(',')}`)
    }
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setSelectedIds([])
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">My Garage</h1>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Manage your bikes and track service history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bikes.length > 0 && (
            <Link href="/bikes/garage/stats">
              <Button variant="secondary" size="sm">
                <BarChart2 className="mr-1.5 h-4 w-4" />
                Stats
              </Button>
            </Link>
          )}

          {bikes.length >= 2 && !compareMode && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setCompareMode(true)}>
              <GitCompare className="mr-1.5 h-4 w-4" />
              Compare
            </Button>
          )}

          {compareMode && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleCompare}
                disabled={selectedIds.length < 2}
              >
                Compare ({selectedIds.length})
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={exitCompareMode}>
                Cancel
              </Button>
            </>
          )}

          {!compareMode && (
            <Link href="/bikes/garage/new">
              <Button>Add Bike</Button>
            </Link>
          )}
        </div>
      </div>

      {bikes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bikes.map(bike => (
            compareMode ? (
              <div
                key={bike.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleSelect(bike.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSelect(bike.id) }}
                className={[
                  'relative cursor-pointer rounded-lg transition-all',
                  selectedIds.includes(bike.id)
                    ? 'ring-2 ring-[var(--color-primary)] ring-offset-2'
                    : 'opacity-80 hover:opacity-100',
                  selectedIds.length >= 3 && !selectedIds.includes(bike.id)
                    ? 'cursor-not-allowed opacity-40'
                    : '',
                ].join(' ')}
              >
                {selectedIds.includes(bike.id) && (
                  <div className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                    {selectedIds.indexOf(bike.id) + 1}
                  </div>
                )}
                <BikeCard bike={bike} />
              </div>
            ) : (
              <BikeCard key={bike.id} bike={bike} />
            )
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bike className="h-12 w-12" />}
          title="No bikes in your garage"
          description="Add your first bike to start tracking your rides and service history."
          action={
            <Link href="/bikes/garage/new">
              <Button>Add Your First Bike</Button>
            </Link>
          }
        />
      )}

      {compareMode && (
        <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
          Select 2 or 3 bikes to compare. {selectedIds.length < 2 ? `Select ${2 - selectedIds.length} more.` : 'Ready to compare!'}
        </p>
      )}
    </div>
  )
}
