import Link from 'next/link'
import { Card, Badge } from '@/ui/components'
import { DifficultyIndicator } from './DifficultyIndicator'
import type { TrailSummary } from '../types'

interface TrailListProps {
  trails: TrailSummary[]
  systemSlug: string
}

const trailTypeBadge: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'warning' }> = {
  singletrack: { label: 'Singletrack', variant: 'default' },
  doubletrack: { label: 'Doubletrack', variant: 'default' },
  flow: { label: 'Flow', variant: 'success' },
  technical: { label: 'Technical', variant: 'warning' },
  downhill: { label: 'Downhill', variant: 'info' },
  climb: { label: 'Climb', variant: 'warning' },
  connector: { label: 'Connector', variant: 'default' },
}

export function TrailList({ trails }: TrailListProps) {
  if (trails.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        No trails found for this system.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {trails.map((trail) => {
        const typeInfo = trailTypeBadge[trail.trailType] ?? {
          label: trail.trailType.replace(/_/g, ' '),
          variant: 'default' as const,
        }

        return (
          <Link
            key={trail.id}
            href={`/trails/${trail.slug}`}
            className="block"
          >
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                {/* Trail info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {trail.name}
                    </h3>
                    <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                    {trail.gpsTrack && (
                      <span
                        className="text-[var(--color-text-muted)]"
                        title="GPS track available"
                        aria-label="GPS track available"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Difficulty indicators */}
                  <div className="mt-2 flex items-center gap-4">
                    <DifficultyIndicator
                      level={trail.physicalDifficulty}
                      label="Physical"
                    />
                    <DifficultyIndicator
                      level={trail.technicalDifficulty}
                      label="Technical"
                    />
                  </div>
                </div>

                {/* Stats column */}
                <div className="flex shrink-0 flex-col items-end gap-1 text-sm text-[var(--color-text-muted)]">
                  {trail.distance != null && (
                    <span>{trail.distance.toFixed(1)} mi</span>
                  )}
                  {trail.elevationGain != null && (
                    <span>{Math.round(trail.elevationGain * 3.28084)} ft gain</span>
                  )}
                  {trail._count.reviews > 0 && (
                    <span>
                      {trail._count.reviews}{' '}
                      {trail._count.reviews === 1 ? 'review' : 'reviews'}
                    </span>
                  )}
                </div>
              </div>

              {/* Status / condition row */}
              {(trail.status !== 'open' || trail.condition) && (
                <div className="mt-3 flex items-center gap-2">
                  {trail.status !== 'open' && (
                    <Badge variant={trail.status === 'closed' ? 'error' : 'warning'}>
                      {trail.status}
                    </Badge>
                  )}
                  {trail.condition && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {trail.condition}
                    </span>
                  )}
                </div>
              )}
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
