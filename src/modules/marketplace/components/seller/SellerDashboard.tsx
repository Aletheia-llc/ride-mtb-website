import Link from 'next/link'
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  Star,
  Plus,
  ArrowRight,
} from 'lucide-react'
import type { SellerDashboardData } from '@/modules/marketplace/types'
import { TrustBadge } from './TrustBadge'
import { SellerReviewCard } from './SellerReviewCard'

/* ---------- helpers ---------- */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function nextLevelInfo(data: SellerDashboardData): string | null {
  const { profile } = data
  const avgRating = profile.averageRating
    ? parseFloat(String(profile.averageRating))
    : 0
  const level = profile.trustLevel

  if (level === 'power') return null

  if (level === 'new') {
    const salesNeeded = Math.max(0, 3 - profile.totalSales)
    const ratingNeeded = avgRating < 4.0
    const parts: string[] = []
    if (salesNeeded > 0) parts.push(`${salesNeeded} more sale${salesNeeded > 1 ? 's' : ''}`)
    if (ratingNeeded && profile.ratingCount > 0) parts.push('4.0+ avg rating')
    if (profile.ratingCount === 0 && salesNeeded <= 0) parts.push('at least one review with 4.0+')
    return parts.length > 0
      ? `Established: Need ${parts.join(' and ')}`
      : 'Established: Almost there!'
  }

  if (level === 'established') {
    const parts: string[] = []
    const salesNeeded = Math.max(0, 10 - profile.totalSales)
    if (salesNeeded > 0) parts.push(`${salesNeeded} more sale${salesNeeded > 1 ? 's' : ''}`)
    if (avgRating < 4.5) parts.push('4.5+ avg rating')
    if (!profile.isVerified) parts.push('ID verification')
    return parts.length > 0
      ? `Trusted: Need ${parts.join(', ')}`
      : 'Trusted: Almost there!'
  }

  if (level === 'trusted') {
    const parts: string[] = []
    const salesNeeded = Math.max(0, 50 - profile.totalSales)
    if (salesNeeded > 0) parts.push(`${salesNeeded} more sale${salesNeeded > 1 ? 's' : ''}`)
    if (avgRating < 4.7) parts.push('4.7+ avg rating')
    return parts.length > 0
      ? `Power Seller: Need ${parts.join(' and ')}`
      : 'Power Seller: Almost there!'
  }

  return null
}

function trustProgress(data: SellerDashboardData): number {
  const { profile } = data
  const level = profile.trustLevel

  if (level === 'power') return 100

  const totalSales = profile.totalSales

  if (level === 'new') {
    return Math.min(100, Math.round((totalSales / 3) * 100))
  }

  if (level === 'established') {
    return Math.min(100, Math.round(((totalSales - 3) / 7) * 100))
  }

  if (level === 'trusted') {
    return Math.min(100, Math.round(((totalSales - 10) / 40) * 100))
  }

  return 0
}

/* ---------- component ---------- */

export function SellerDashboard({ data }: { data: SellerDashboardData }) {
  const { profile, stats, recentReviews } = data
  const avgRating = profile.averageRating
    ? parseFloat(String(profile.averageRating))
    : null
  const progress = trustProgress(data)
  const nextLevel = nextLevelInfo(data)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Seller Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Manage your sales and track your reputation
          </p>
        </div>
        <Link
          href="/marketplace/sell"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Listing
        </Link>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard
          label="Total Sales"
          value={String(stats.soldListings)}
          icon={<ShoppingBag className="h-5 w-5 text-[var(--color-primary)]" />}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="h-5 w-5 text-[var(--color-primary)]" />}
        />
        <StatCard
          label="This Month"
          value={String(stats.thisMonthSales)}
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          label="Active Listings"
          value={String(stats.activeListings)}
          icon={<ShoppingBag className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          label="Pending Offers"
          value={String(stats.pendingOffers)}
          icon={<MessageSquare className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Trust level + Rating */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Trust level card */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Trust Level
            </h2>
            <TrustBadge trustLevel={profile.trustLevel} />
          </div>

          {/* Progress bar */}
          {profile.trustLevel !== 'power' && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {nextLevel && (
                <p className="mt-2 text-xs text-[var(--color-dim)]">{nextLevel}</p>
              )}
            </div>
          )}
          {profile.trustLevel === 'power' && (
            <p className="mt-2 text-xs text-[var(--color-dim)]">
              You have achieved the highest trust level. Keep it up!
            </p>
          )}
        </div>

        {/* Rating summary card */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Rating
          </h2>
          {avgRating !== null ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-[var(--color-text)]">
                {avgRating.toFixed(1)}
              </span>
              <div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(avgRating)
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-[var(--color-border)]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {profile.ratingCount}{' '}
                  {profile.ratingCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No reviews yet.</p>
          )}
        </div>
      </div>

      {/* Recent reviews */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Recent Reviews</h2>
          {profile.reviews.length > 5 && (
            <Link
              href={`/marketplace/seller/${profile.userId}`}
              className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:opacity-80"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        {recentReviews.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {recentReviews.map((review) => (
              <SellerReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/marketplace/sell"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          <Plus className="h-4 w-4" />
          Create Listing
        </Link>
        <Link
          href={`/marketplace/seller/${profile.userId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          <Star className="h-4 w-4" />
          View All Reviews
        </Link>
      </div>
    </div>
  )
}

/* ---------- stat card sub-component ---------- */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      </div>
      <span className="text-xl font-bold text-[var(--color-text)]">{value}</span>
    </div>
  )
}
