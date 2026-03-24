import type { MouseEvent } from 'react'
import Link from 'next/link'
import { Card, Badge } from '@/ui/components'
import type { UserBikeData, BikeCategory } from '../../types/garage'

const categoryBadgeVariant: Record<BikeCategory, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  gravel: 'default',
  xc: 'success',
  trail: 'info',
  enduro: 'warning',
  downhill: 'error',
  dirt_jump: 'default',
  ebike: 'info',
  other: 'default',
}

const categoryLabel: Record<BikeCategory, string> = {
  gravel: 'Gravel',
  xc: 'XC',
  trail: 'Trail',
  enduro: 'Enduro',
  downhill: 'Downhill',
  dirt_jump: 'Dirt Jump',
  ebike: 'E-Bike',
  other: 'Other',
}

interface BikeCardProps {
  bike: UserBikeData
  onCardClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

export function BikeCard({ bike, onCardClick }: BikeCardProps) {
  const yearDisplay = bike.year ? `${bike.year} ` : ''

  return (
    <Link href={`/bikes/garage/${bike.id}`} className="block" onClick={onCardClick}>
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-[var(--color-text)]">
                {bike.name}
              </h3>
              {bike.isPrimary && (
                <Badge variant="gold">Primary</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {yearDisplay}{bike.brand} {bike.model}
            </p>
          </div>
          <Badge variant={categoryBadgeVariant[bike.category]}>
            {categoryLabel[bike.category]}
          </Badge>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
          {bike.wheelSize && (
            <span>{bike.wheelSize} wheels</span>
          )}
          {bike.frameSize && (
            <span>Size {bike.frameSize}</span>
          )}
          {bike._count != null && (
            <span>
              {bike._count.serviceLogs}{' '}
              {bike._count.serviceLogs === 1 ? 'service entry' : 'service entries'}
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}
