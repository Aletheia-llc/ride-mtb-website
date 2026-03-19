import Image from 'next/image'
import { Star, Clock, Calendar } from 'lucide-react'
import type { SellerProfileWithReviews } from '@/modules/marketplace/types'
import { TrustBadge } from './TrustBadge'
import { SellerReviewCard } from './SellerReviewCard'
import { ListingCard } from '@/modules/marketplace/components/listing/ListingCard'

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return 'N/A'
  if (minutes < 60) return `~${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `~${hours}h`
  const days = Math.round(hours / 24)
  return `~${days}d`
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export function SellerProfilePage({
  profile,
}: {
  profile: SellerProfileWithReviews
}) {
  const displayName = profile.user.name ?? 'Unknown Seller'
  const initial = displayName.charAt(0).toUpperCase()

  const avgRating = profile.averageRating
    ? parseFloat(String(profile.averageRating))
    : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header section */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          {profile.user.image ? (
            <Image
              src={profile.user.image}
              alt={displayName}
              width={80}
              height={80}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-2xl font-bold text-white">
              {initial}
            </div>
          )}

          {/* Name + badges + meta */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">{displayName}</h1>
              <TrustBadge trustLevel={profile.trustLevel} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Member since {formatDate(profile.createdAt)}
              </span>
              {profile.isVerified && (
                <span className="font-medium text-[var(--color-primary)]">ID Verified</span>
              )}
            </div>

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              {/* Sales */}
              <div className="text-center">
                <span className="block text-lg font-bold text-[var(--color-text)]">
                  {profile.totalSales}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {profile.totalSales === 1 ? 'Sale' : 'Sales'}
                </span>
              </div>

              {/* Rating */}
              {avgRating !== null && (
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-[var(--color-text)]">
                      {avgRating.toFixed(1)}
                    </span>
                    <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    ({profile.ratingCount}{' '}
                    {profile.ratingCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}

              {/* Response time */}
              {profile.avgResponseTime !== null && (
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                  <Clock className="h-4 w-4" />
                  <span>
                    Responds in {formatResponseTime(profile.avgResponseTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">
          Reviews ({profile.reviews.length})
        </h2>
        {profile.reviews.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            This seller has no reviews yet.
          </p>
        ) : (
          <div className="space-y-3">
            {profile.reviews.map((review) => (
              <SellerReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>

      {/* Active listings section */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">
          Active Listings ({profile.listings.length})
        </h2>
        {profile.listings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No active listings from this seller.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
