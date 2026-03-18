import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mountain, Star, MapPin, Route, TrendingUp, Users } from 'lucide-react'
import {
  TrailList,
  TrailMapDynamic as TrailMap,
  DifficultyDistribution,
  PhotoGallery,
  GetDirectionsButton,
  ShareButton,
} from '@/modules/trails'
import type { TrailSummary } from '@/modules/trails'
import { SYSTEM_TYPE_LABELS } from '@/modules/trails/lib/difficulty'
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
    description:
      system.description ??
      `Explore ${system.trails.length} trails at ${system.name}${location ? ` in ${location}` : ''}. Find trail maps, difficulty ratings, and riding conditions.`,
    openGraph: {
      title: `${system.name} | Ride MTB`,
      description:
        system.description ??
        `Explore trails at ${system.name}${location ? ` in ${location}` : ''}.`,
      ...(system.coverImageUrl && { images: [{ url: system.coverImageUrl }] }),
    },
  }
}

export default async function SystemDetailPage({ params }: Props) {
  const { systemSlug } = await params
  const system = await getTrailSystemBySlug(systemSlug)

  if (!system) {
    notFound()
  }

  const location = [system.city, system.state].filter(Boolean).join(', ')

  // Trails with GPS data for the map
  const trailsWithGps = system.trails
    .filter((t) => t.gpsTrack?.trackData)
    .map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      trackData: t.gpsTrack!.trackData!,
      difficulty: t.physicalDifficulty,
    }))

  // Calculate map center from system coordinates
  const mapCenter: [number, number] | undefined =
    system.longitude != null && system.latitude != null
      ? [system.longitude, system.latitude]
      : undefined

  // Difficulty distribution from trails
  const distribution: Record<number, number> = {}
  for (const trail of system.trails) {
    const level = trail.physicalDifficulty ?? 1
    distribution[level] = (distribution[level] ?? 0) + 1
  }

  // Use trailhead coords for directions if available, otherwise system coords
  const directionsLat = system.trailheadLat ?? system.latitude
  const directionsLng = system.trailheadLng ?? system.longitude

  const systemTypeLabel = system.systemType
    ? (SYSTEM_TYPE_LABELS[system.systemType] ?? system.systemType)
    : null

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

      {/* Hero section */}
      <div className="mb-8">
        {/* Cover image or mountain icon fallback */}
        <div className="relative mb-6 h-64 overflow-hidden rounded-2xl bg-[var(--color-bg-secondary)] sm:h-80">
          {system.coverImageUrl ? (
            <Image
              src={system.coverImageUrl}
              alt={system.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Mountain className="h-24 w-24 text-[var(--color-text-muted)] opacity-30" />
            </div>
          )}
          {/* Status badge overlaid on image */}
          <div className="absolute right-4 top-4">
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
        </div>

        {/* System name and meta */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {systemTypeLabel && (
                <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                  {systemTypeLabel}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              {system.name}
            </h1>
            {location && (
              <p className="mt-1 flex items-center gap-1 text-[var(--color-text-muted)]">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                {location}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {directionsLat != null && directionsLng != null && (
              <GetDirectionsButton lat={directionsLat} lng={directionsLng} />
            )}
            <ShareButton title={system.name} text={system.description ?? undefined} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[var(--color-text-muted)]">
            <Route className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Trails</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">
            {system.trails.length}
          </p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[var(--color-text-muted)]">
            <Route className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Miles</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">
            {system.totalMiles != null ? system.totalMiles.toFixed(1) : '—'}
          </p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[var(--color-text-muted)]">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Vert</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">
            {system.totalVertFt != null
              ? `${system.totalVertFt.toLocaleString()}ft`
              : '—'}
          </p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[var(--color-text-muted)]">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-xs uppercase tracking-wide">Rating</span>
          </div>
          {system.averageRating != null ? (
            <>
              <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">
                {Number(system.averageRating).toFixed(1)}
              </p>
              {system.reviewCount != null && system.reviewCount > 0 && (
                <p className="flex items-center justify-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <Users className="h-3 w-3" />
                  {system.reviewCount}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">—</p>
          )}
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[var(--color-text-muted)]">
            <Users className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Rides</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">
            {system.rideCount != null ? system.rideCount.toLocaleString() : '—'}
          </p>
        </Card>
      </div>

      {/* Photo gallery */}
      {system.photos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
            Photos
          </h2>
          <PhotoGallery photos={system.photos} />
        </section>
      )}

      {/* Trail map */}
      {trailsWithGps.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
            Trail Map
          </h2>
          <Card className="overflow-hidden p-0">
            <TrailMap
              trails={trailsWithGps}
              center={mapCenter}
              zoom={13}
              trailheadLat={system.trailheadLat}
              trailheadLng={system.trailheadLng}
              className="h-[400px] rounded-xl"
            />
          </Card>
        </section>
      )}

      {/* Difficulty distribution */}
      {Object.keys(distribution).length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
            Difficulty Breakdown
          </h2>
          <Card className="p-4">
            <DifficultyDistribution distribution={distribution} />
          </Card>
        </section>
      )}

      {/* Trail list */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
          Trails
        </h2>
        <TrailList
          trails={system.trails.map((t) => ({
            ...t,
            condition: t.currentCondition,
            system: { name: system.name, slug: system.slug },
            _count: { reviews: 0 },
          })) satisfies TrailSummary[]}
          systemSlug={systemSlug}
        />
      </section>

      {/* Info section */}
      {(system.description ||
        system.seasonalNotes ||
        system.passRequired ||
        system.parkingInfo ||
        system.trailheadNotes ||
        system.websiteUrl ||
        system.phone ||
        system.dogFriendly != null ||
        system.eMtbAllowed != null) && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
            About This System
          </h2>
          <Card className="divide-y divide-[var(--color-border)] p-0">
            {system.description && (
              <div className="px-5 py-4">
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {system.description}
                </p>
              </div>
            )}

            {(system.seasonalNotes ||
              system.passRequired ||
              system.parkingInfo ||
              system.trailheadNotes ||
              system.websiteUrl ||
              system.phone ||
              system.dogFriendly != null ||
              system.eMtbAllowed != null) && (
              <dl className="divide-y divide-[var(--color-border)]">
                {system.seasonalNotes && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      Seasonal Notes
                    </dt>
                    <dd className="text-sm text-[var(--color-text-muted)]">
                      {system.seasonalNotes}
                    </dd>
                  </div>
                )}

                {system.passRequired && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      Pass / Fee
                    </dt>
                    <dd className="text-sm text-[var(--color-text-muted)]">
                      Pass or fee required
                    </dd>
                  </div>
                )}

                {system.parkingInfo && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      Parking
                    </dt>
                    <dd className="text-sm text-[var(--color-text-muted)]">
                      {system.parkingInfo}
                    </dd>
                  </div>
                )}

                {system.trailheadNotes && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      Trailhead Notes
                    </dt>
                    <dd className="text-sm text-[var(--color-text-muted)]">
                      {system.trailheadNotes}
                    </dd>
                  </div>
                )}

                {system.websiteUrl && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      Website
                    </dt>
                    <dd className="text-sm">
                      <a
                        href={system.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        {system.websiteUrl}
                      </a>
                    </dd>
                  </div>
                )}

                {system.phone && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      Phone
                    </dt>
                    <dd className="text-sm text-[var(--color-text-muted)]">
                      <a
                        href={`tel:${system.phone}`}
                        className="hover:text-[var(--color-text)]"
                      >
                        {system.phone}
                      </a>
                    </dd>
                  </div>
                )}

                {system.dogFriendly != null && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      Dogs Allowed
                    </dt>
                    <dd className="text-sm text-[var(--color-text-muted)]">
                      {system.dogFriendly ? (
                        <span className="text-green-500">Yes</span>
                      ) : (
                        'No'
                      )}
                    </dd>
                  </div>
                )}

                {system.eMtbAllowed != null && (
                  <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="min-w-[160px] text-sm font-medium text-[var(--color-text)]">
                      eMTB Allowed
                    </dt>
                    <dd className="text-sm text-[var(--color-text-muted)]">
                      {system.eMtbAllowed ? (
                        <span className="text-green-500">Yes</span>
                      ) : (
                        'No'
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </Card>
        </section>
      )}
    </div>
  )
}
