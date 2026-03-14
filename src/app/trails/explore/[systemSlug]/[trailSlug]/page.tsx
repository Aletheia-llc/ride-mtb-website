import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { TrailDetailView, TrailReviewForm, TrailMapDynamic as TrailMap, ElevationProfileDynamic as ElevationProfile } from '@/modules/trails'
import { ConditionBadge } from '@/modules/trails/components/ConditionBadge'
import { ConditionReportForm } from '@/modules/trails/components/ConditionReportForm'
import { Card } from '@/ui/components'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getTrailBySlug, isTrailFavorited, getRecentConditionReports } from '@/modules/trails/lib/queries'

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
  const [favorited, conditionReports] = await Promise.all([
    currentUserId ? isTrailFavorited(trail.id, currentUserId) : Promise.resolve(false),
    getRecentConditionReports(trail.id),
  ])

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

      {/* Conditions section */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Trail Conditions</h2>
        <Card className="space-y-4">
          {/* Current condition badge */}
          {(trail as unknown as { currentCondition?: string | null; conditionReportedAt?: Date | null }).currentCondition && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Current Condition</p>
              <ConditionBadge
                condition={(trail as unknown as { currentCondition: string }).currentCondition}
                reportedAt={(trail as unknown as { conditionReportedAt?: Date | null }).conditionReportedAt}
              />
            </div>
          )}

          {/* Recent reports */}
          {conditionReports.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Recent Reports</p>
              <ul className="space-y-1">
                {conditionReports.map(r => (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <ConditionBadge condition={r.condition} />
                    <span className="text-[var(--color-text-muted)]">
                      {r.user.name ?? 'Rider'} · {new Date(r.reportedAt).toLocaleDateString()}
                    </span>
                    {r.notes && <span className="truncate text-[var(--color-text)]">{r.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Report form */}
          {currentUserId && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Report Conditions</p>
              <ConditionReportForm trailId={trail.id} />
            </div>
          )}
          {!currentUserId && (
            <p className="text-sm text-[var(--color-text-muted)]">
              <a href="/auth/signin" className="text-[var(--color-primary)] hover:underline">Sign in</a> to report trail conditions.
            </p>
          )}
        </Card>
      </section>

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
