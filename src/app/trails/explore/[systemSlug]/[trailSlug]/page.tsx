import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { TrailDetailView, TrailReviewForm } from '@/modules/trails'
import { Card, Skeleton } from '@/ui/components'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getTrailBySlug, isTrailFavorited } from '@/modules/trails/lib/queries'

const TrailMap = dynamic(
  () =>
    import('@/modules/trails/components/TrailMap').then((m) => ({
      default: m.TrailMap,
    })),
  {
    ssr: false,
    loading: () => <Skeleton variant="map" />,
  },
)

const ElevationProfile = dynamic(
  () =>
    import('@/modules/trails/components/ElevationProfile').then((m) => ({
      default: m.ElevationProfile,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full" />,
  },
)

interface Props {
  params: Promise<{ systemSlug: string; trailSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trailSlug } = await params
  const trail = await getTrailBySlug(trailSlug)
  if (!trail) {
    return { title: 'Trail Not Found | Ride MTB' }
  }
  const location = [trail.system.city, trail.system.state]
    .filter(Boolean)
    .join(', ')
  return {
    title: `${trail.name} - ${trail.system.name} | Ride MTB`,
    description:
      trail.description ??
      `${trail.name} at ${trail.system.name}${location ? ` in ${location}` : ''}. View trail details, map, and reviews.`,
  }
}

export default async function TrailDetailPage({ params }: Props) {
  const { trailSlug } = await params
  const [trail, session] = await Promise.all([
    getTrailBySlug(trailSlug),
    auth(),
  ])

  if (!trail) {
    notFound()
  }

  const currentUserId = session?.user?.id ?? null
  const favorited = currentUserId
    ? await isTrailFavorited(trail.id, currentUserId)
    : false

  // Prepare map data if GPS track exists
  const hasGpsData = !!trail.gpsTrack?.simplifiedTrack
  const mapTrails = hasGpsData
    ? [
        {
          id: trail.id,
          name: trail.name,
          slug: trail.slug,
          trackData: trail.gpsTrack!.simplifiedTrack!,
          difficulty: trail.physicalDifficulty,
        },
      ]
    : []

  // Determine map center from trail bounds
  const mapCenter: [number, number] | undefined =
    trail.gpsTrack?.boundsNeLat != null &&
    trail.gpsTrack?.boundsSwLat != null &&
    trail.gpsTrack?.boundsNeLng != null &&
    trail.gpsTrack?.boundsSwLng != null
      ? [
          (trail.gpsTrack.boundsNeLng + trail.gpsTrack.boundsSwLng) / 2,
          (trail.gpsTrack.boundsNeLat + trail.gpsTrack.boundsSwLat) / 2,
        ]
      : undefined

  // Find the user's existing review, if any
  const existingReview = currentUserId
    ? trail.reviews.find(
        (r) =>
          'userId' in r &&
          (r as unknown as { userId: string }).userId === currentUserId,
      )
    : undefined

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <TrailDetailView
        trail={trail}
        isFavorited={favorited}
        currentUserId={currentUserId}
      >
        {/* Map */}
        {hasGpsData && (
          <Card className="overflow-hidden p-0">
            <TrailMap
              trails={mapTrails}
              center={mapCenter}
              zoom={14}
              selectedTrailId={trail.id}
              className="h-[350px] rounded-xl"
            />
          </Card>
        )}

        {/* Elevation profile */}
        {hasGpsData && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
              Elevation Profile
            </h3>
            <ElevationProfile
              trackData={trail.gpsTrack!.simplifiedTrack!}
            />
          </Card>
        )}
      </TrailDetailView>

      {/* Reviews section */}
      <section className="mt-10">
        <h2 className="mb-6 text-xl font-bold text-[var(--color-text)]">
          Reviews
          {trail._count.reviews > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({trail._count.reviews})
            </span>
          )}
        </h2>

        {/* Review form (logged in users only) */}
        {currentUserId && (
          <Card className="mb-8">
            <TrailReviewForm
              trailId={trail.id}
              existingReview={existingReview}
            />
          </Card>
        )}

        {/* Existing reviews */}
        {trail.reviews.length > 0 ? (
          <div className="space-y-4">
            {trail.reviews.map((review) => (
              <Card key={review.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {review.user.image ? (
                      <Image
                        src={review.user.image}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-xs font-medium text-[var(--color-text-muted)]">
                        {review.user.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {review.user.name ?? 'Anonymous'}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < review.rating
                            ? 'text-yellow-400'
                            : 'text-[var(--color-border)]'
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm text-[var(--color-text)]">
                    {review.comment}
                  </p>
                )}
                {(review.bikeType || review.rideDate) && (
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                    {review.bikeType && <span>Bike: {review.bikeType}</span>}
                    {review.rideDate && (
                      <span>
                        Rode:{' '}
                        {new Date(review.rideDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          !currentUserId && (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              No reviews yet. Sign in to be the first to review this trail.
            </p>
          )
        )}
      </section>
    </div>
  )
}
