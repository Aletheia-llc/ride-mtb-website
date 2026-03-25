import Link from 'next/link'
import { Card, Badge } from '@/ui/components'
import type { TrailSystemSummary } from '../types'

interface SystemCardProps {
  system: TrailSystemSummary
}

const systemTypeBadge: Record<string, { label: string; variant: 'default' | 'success' | 'info' | 'warning' }> = {
  trail_network: { label: 'Trail Network', variant: 'default' },
  bike_park: { label: 'Bike Park', variant: 'info' },
  ski_resort: { label: 'Ski Resort', variant: 'warning' },
}

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  open: 'success',
  seasonal: 'warning',
  closed: 'error',
}

export function SystemCard({ system }: SystemCardProps) {
  const trailCount = system._count.trails
  const typeInfo = systemTypeBadge[system.systemType] ?? {
    label: system.systemType.replace(/_/g, ' '),
    variant: 'default' as const,
  }

  const location = [system.city, system.state].filter(Boolean).join(', ')

  return (
    <Link href={`/trails/systems/${system.slug}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[var(--color-text)]">
              {system.name}
            </h3>
            {location && (
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                {location}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
            <Badge variant={statusVariant[system.status] ?? 'default'}>
              {system.status}
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm text-[var(--color-text-muted)]">
          <span>
            <strong className="font-medium text-[var(--color-text)]">{trailCount}</strong>{' '}
            {trailCount === 1 ? 'trail' : 'trails'}
          </span>
          {system.totalMiles > 0 && (
            <span>
              <strong className="font-medium text-[var(--color-text)]">
                {system.totalMiles.toFixed(1)}
              </strong>{' '}
              miles
            </span>
          )}
        </div>

        {system.description && (
          <p className="mt-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">
            {system.description}
          </p>
        )}
      </Card>
    </Link>
  )
}
