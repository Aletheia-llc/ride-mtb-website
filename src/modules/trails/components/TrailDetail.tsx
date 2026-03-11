import Link from 'next/link'
import { Badge } from '@/ui/components'
import { DifficultyIndicator } from './DifficultyIndicator'
import { FavoriteButton } from './FavoriteButton'
import type { TrailDetail as TrailDetailType } from '../types'

interface TrailDetailProps {
  trail: TrailDetailType
  isFavorited: boolean
  currentUserId: string | null
  children?: React.ReactNode // Slot for map and elevation profile
}

const M_TO_FT = 3.28084

function formatFeet(meters: number | null): string | null {
  if (meters == null) return null
  return `${Math.round(meters * M_TO_FT).toLocaleString()} ft`
}

function formatMiles(miles: number | null): string | null {
  if (miles == null) return null
  return `${miles.toFixed(1)} mi`
}

const trailTypeLabel: Record<string, string> = {
  singletrack: 'Singletrack',
  doubletrack: 'Doubletrack',
  flow: 'Flow',
  technical: 'Technical',
  downhill: 'Downhill',
  climb: 'Climb',
  connector: 'Connector',
}

export function TrailDetailView({
  trail,
  isFavorited,
  currentUserId,
  children,
}: TrailDetailProps) {
  const location = [trail.system.city, trail.system.state]
    .filter(Boolean)
    .join(', ')

  const stats = [
    { label: 'Distance', value: formatMiles(trail.distance) },
    { label: 'Elev. Gain', value: formatFeet(trail.elevationGain) },
    { label: 'Elev. Loss', value: formatFeet(trail.elevationLoss) },
    { label: 'High Point', value: formatFeet(trail.highPoint) },
    { label: 'Low Point', value: formatFeet(trail.lowPoint) },
  ].filter((s) => s.value != null)

  const avgRating =
    trail._count.reviews > 0
      ? trail.reviews.reduce((sum, r) => sum + r.rating, 0) /
        trail.reviews.length
      : null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/trails"
          className="transition-colors hover:text-[var(--color-text)]"
        >
          Trails
        </Link>
        <span>/</span>
        <Link
          href={`/trails/systems/${trail.system.slug}`}
          className="transition-colors hover:text-[var(--color-text)]"
        >
          {trail.system.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{trail.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {trail.name}
          </h1>
          {location && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {location}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {avgRating != null && (
            <div className="text-right">
              <div className="text-lg font-bold text-[var(--color-text)]">
                {avgRating.toFixed(1)}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {trail._count.reviews}{' '}
                {trail._count.reviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          )}
          <FavoriteButton
            trailId={trail.id}
            isFavorited={isFavorited}
            favoriteCount={trail._count.favorites}
            isAuthenticated={!!currentUserId}
          />
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">
          {trailTypeLabel[trail.trailType] ?? trail.trailType.replace(/_/g, ' ')}
        </Badge>
        <Badge variant={trail.status === 'open' ? 'success' : trail.status === 'closed' ? 'error' : 'warning'}>
          {trail.status}
        </Badge>
        {trail.condition && (
          <Badge variant="default">{trail.condition}</Badge>
        )}
      </div>

      {/* Difficulty */}
      <div className="flex items-center gap-6">
        <DifficultyIndicator
          level={trail.physicalDifficulty}
          label="Physical"
        />
        <DifficultyIndicator
          level={trail.technicalDifficulty}
          label="Technical"
        />
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-center"
            >
              <div className="text-xs text-[var(--color-text-muted)]">
                {stat.label}
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {trail.description && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
          {trail.description}
        </p>
      )}

      {/* Map & elevation profile slot */}
      {children}
    </div>
  )
}
