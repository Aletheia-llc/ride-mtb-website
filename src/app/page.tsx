// src/app/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth/config'
/* eslint-disable no-restricted-imports */
import { getFeedCandidates, getTrendingItems } from '@/modules/feed/lib/queries'
import { scoreFeedItems, getBehaviorScores } from '@/modules/feed/lib/personalization'
import { HeroSection } from '@/modules/feed/components/HeroSection'
import { LeftSidebar } from '@/modules/feed/components/LeftSidebar'
import { RightSidebar } from '@/modules/feed/components/RightSidebar'
import { FeedClient } from '@/modules/feed/components/FeedClient'
import { MTBNewsFeed } from '@/modules/feed/components/MTBNewsFeed'
import { getUpcomingEvents } from '@/modules/events/lib/queries'
import { GuestHomeFeed } from '@/modules/feed/components/GuestHomeFeed'
/* eslint-enable no-restricted-imports */

import { getUserXP, getWeeklyXp } from '@/modules/xp'
import { db } from '@/lib/db/client'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

export const metadata: Metadata = {
  title: 'Ride MTB — Mountain Bike Community',
  description: 'The MTB platform for riders. Trails, gear, community, learning.',
  openGraph: {
    type: 'website',
    title: 'Ride MTB — Mountain Bike Community',
    description: 'The MTB platform for riders. Trails, gear, community, learning.',
    images: [{ url: `${BASE_URL}/icons/icon-512x512.png`, width: 512, height: 512 }],
  },
}

const PAGE_SIZE = 10

export default async function HomePage() {
  const session = await auth()
  const userId = session?.user?.id ?? null

  if (!session?.user) {
    const [trailCount, shopCount, riderCount] = await Promise.all([
      db.trail.count({ where: { status: 'open' } }).catch(() => 83000),
      db.facility.count({ where: { type: 'BIKE_SHOP' } }).catch(() => 22000),
      db.user.count().catch(() => 0),
    ])
    return (
      <>
        <HeroSection stats={{ trailCount, shopCount, riderCount }} />
        <Suspense fallback={null}>
          <MTBNewsFeed />
        </Suspense>
        <GuestHomeFeed />
      </>
    )
  }

  // Fetch all data in parallel
  const [candidates, trendingItems, { events: upcomingEvents }, xpAggregate, weeklyXp, userProfile] =
    await Promise.all([
      getFeedCandidates(),
      getTrendingItems(5),
      getUpcomingEvents(undefined, 1, 3),
      userId ? getUserXP(userId) : Promise.resolve(null),
      userId ? getWeeklyXp(userId) : Promise.resolve(0),
      userId
        ? db.user.findUnique({
            where: { id: userId },
            select: { interests: true, skillLevel: true, ridingStyle: true, location: true },
          })
        : Promise.resolve(null),
    ])

  // Rank candidates
  let rankedItems = candidates

  if (userId && userProfile) {
    const behaviorScores = await getBehaviorScores(userId)
    rankedItems = scoreFeedItems(
      candidates,
      {
        interests: userProfile.interests,
        skillLevel: userProfile.skillLevel as string | null,
        ridingStyle: userProfile.ridingStyle ?? null,
        location: userProfile.location ?? null,
      },
      behaviorScores,
    )
  }

  const initialPage = rankedItems.slice(0, PAGE_SIZE)
  const hasMore = rankedItems.length > PAGE_SIZE
  const nextCursor = hasMore ? '2' : null

  // Strip internal fields for client
  const initialItems = initialPage.map(({ category, engagementScore, createdAt, ...rest }) => rest)

  const xpData = userId && xpAggregate
    ? {
        totalXp: xpAggregate.totalXp,
        streakDays: xpAggregate.streakDays,
        weeklyXp,
        nextLevelXp: Math.ceil((xpAggregate.totalXp + 1) / 100) * 100,
      }
    : undefined

  return (
    <>
      {!userId && <HeroSection />}

      <Suspense fallback={null}>
        <MTBNewsFeed />
      </Suspense>

      <div
        className="mx-auto px-4 py-6"
        style={{ maxWidth: 'var(--max-content-width)' }}
      >
        <div className="homepage-grid">
          <LeftSidebar
            isLoggedIn={!!userId}
            xpData={xpData}
            interests={userProfile?.interests}
            trendingItems={trendingItems}
          />

          <main>
            <FeedClient
              initialItems={initialItems}
              initialHasMore={hasMore}
              initialCursor={nextCursor}
              isLoggedIn={!!userId}
            />
          </main>

          <RightSidebar upcomingEvents={upcomingEvents} />
        </div>
      </div>
    </>
  )
}
