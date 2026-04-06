import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { BookOpen, MessageSquare, Map, Bike, Flame, Trophy, Plus, ArrowRight } from 'lucide-react'
import { Suspense } from 'react'
import { Card } from '@/ui/components'
import { ActivityFeed, XPOverview } from '@/modules/profile'
// eslint-disable-next-line no-restricted-imports
import { getUserProfile, getRecentActivity } from '@/modules/profile/lib/queries'
import { NearbyTrails } from '@/modules/trails/components/NearbyTrails'

export const metadata: Metadata = {
  title: 'Dashboard | Ride MTB',
  description: 'Your personal Ride MTB dashboard.',
}

const QUICK_ACTIONS = [
  { label: 'New Forum Post', href: '/forum/new', icon: Plus, description: 'Start a discussion' },
  { label: 'Browse Courses', href: '/learn/courses', icon: BookOpen, description: 'Continue learning' },
  { label: 'Explore Trails', href: '/trails', icon: Map, description: 'Find trails near you' },
  { label: 'Bike Selector', href: '/bikes/selector', icon: Bike, description: 'Find your perfect bike' },
]

export default async function DashboardPage() {
  const sessionUser = await requireAuth()

  if (!sessionUser.onboardingCompletedAt) {
    redirect('/onboarding')
  }

  const [profile, activities] = await Promise.all([
    getUserProfile(sessionUser.id),
    getRecentActivity(sessionUser.id, 8),
  ])

  if (!profile) notFound()

  const displayName = profile.name || profile.username || 'Rider'
  const totalXp = profile.xpAggregate?.totalXp ?? 0
  const streakDays = profile.xpAggregate?.streakDays ?? 0

  const stats = [
    { label: 'Total XP', value: totalXp.toLocaleString(), icon: Trophy, color: 'text-yellow-500' },
    { label: 'Day Streak', value: streakDays, icon: Flame, color: 'text-orange-500' },
    { label: 'Forum Posts', value: profile._count.posts, icon: MessageSquare, color: 'text-[var(--color-primary)]' },
    { label: 'Trail Reviews', value: profile._count.trailReviews, icon: Map, color: 'text-green-500' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Here&apos;s what&apos;s happening across your Ride MTB account.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: XP + Activity */}
        <div className="space-y-6 lg:col-span-2">
          <XPOverview xpAggregate={profile.xpAggregate} />
          <ActivityFeed activities={activities} />
        </div>

        {/* Right: Quick actions */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Quick Actions
            </h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map(({ label, href, icon: Icon, description }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                    <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
                </Link>
              ))}
            </div>
          </Card>

          <Suspense fallback={null}>
            <Card>
              <NearbyTrails userLocation={profile.location ?? null} />
            </Card>
          </Suspense>

          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Your Profile
            </h2>
            <div className="space-y-2">
              <Link
                href="/profile"
                className="flex items-center justify-between rounded-lg p-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
              >
                View public profile
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/profile/settings"
                className="flex items-center justify-between rounded-lg p-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
              >
                Edit settings
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/forum/bookmarks"
                className="flex items-center justify-between rounded-lg p-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
              >
                Saved threads
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
