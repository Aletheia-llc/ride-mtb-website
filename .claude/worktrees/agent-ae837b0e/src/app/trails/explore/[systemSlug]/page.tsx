import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TrailList, TrailMapDynamic as TrailMap } from '@/modules/trails'
import type { TrailSummary } from '@/modules/trails'
import { Card, Badge } from '@/ui/components'
// eslint-disable-next-line no-restricted-imports
import { getTrailSystemBySlug } from '@/modules/trails/lib/queries'

interface Props {
  params: Promise<{ systemSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { systemSlug } = await params
  const system = await getTrailSystemBySlug(systemSlug)
  if (!system) {
    return { title: 'System Not Found | Ride MTB' }
  }
  const location = [system.city, system.state].filter(Boolean).join(', ')
  return {
    title: `${system.name} | Ride MTB`,
    description: system.description
      ?? `Explore trails at ${system.name}${location ? ` in ${location}` : ''}.`,
  }
}

export default async function SystemDetailPage({ params }: Props) {
  const { systemSlug } = await params
  const system = await getTrailSystemBySlug(systemSlug)

  if (!system) {
    notFound()
  }

  const location = [system.city, system.state].filter(Boolean).join(', ')
  const totalMiles = system.trails.reduce(
    (sum, t) => sum + (t.distance ?? 0),
    0,
  )

  // Trails with GPS data for the map
  const trailsWithGps = system.trails
    .filter((t) => t.gpsTrack?.simplifiedTrack)
    .map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      trackData: t.gpsTrack!.simplifiedTrack!,
      difficulty: t.physicalDifficulty,
    }))

  // Calculate map center from system coordinates or first trail bounds
  const mapCenter: [number, number] | undefined =
    system.longitude != null && system.latitude != null
      ? [system.longitude, system.latitude]
      : undefined

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/trails"
          className="transition-colors hover:text-[var(--color-text)]"
        >
          Trails
        </Link>
        <span>/</span>
        <Link
          href="/trails/explore"
          className="transition-colors hover:text-[var(--color-text)]"
        >
          Explore
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{system.name}</span>
      </nav>

      {/* System header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              {system.name}
            </h1>
            {location && (
              <p className="mt-1 text-[var(--color-text-muted)]">{location}</p>
            )}
          </div>
          <Badge
            variant={
              system.status === 'open'
                ? 'success'
                : String(system.status).startsWith('closed')
                  ? 'error'
                  : 'warning'
            }
          >
            {String(system.status).replace(/_/g, ' ')}
          </Badge>
        </div>

        {system.description && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
            {system.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-6 flex items-center gap-6 text-sm text-[var(--color-text-muted)]">
          <span>
            <strong className="font-medium text-[var(--color-text)]">
              {system.trails.length}
            </strong>{' '}
            {system.trails.length === 1 ? 'trail' : 'trails'}
          </span>
          {totalMiles > 0 && (
            <span>
              <strong className="font-medium text-[var(--color-text)]">
                {totalMiles.toFixed(1)}
              </strong>{' '}
              miles total
            </span>
          )}
        </div>
      </div>

      {/* Trail map */}
      {trailsWithGps.length > 0 && (
        <Card className="mb-8 overflow-hidden p-0">
          <TrailMap
            trails={trailsWithGps}
            center={mapCenter}
            zoom={13}
            className="h-[400px] rounded-xl"
          />
        </Card>
      )}

      {/* Trail list */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
          Trails
        </h2>
        <TrailList
          trails={system.trails.map((t) => ({
            ...t,
            system: { name: system.name, slug: system.slug },
            _count: { reviews: 0 },
          })) satisfies TrailSummary[]}
          systemSlug={systemSlug}
        />
      </section>
    </div>
  )
}
