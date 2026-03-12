// src/app/page.tsx
import { auth } from '@/lib/auth/config'
import { getFeedCandidates, getTrendingItems } from '@/modules/feed/lib/queries'
import { scoreFeedItems, getBehaviorScores } from '@/modules/feed/lib/personalization'
import { getUserXP, getWeeklyXp } from '@/modules/xp'
import { getUpcomingEvents } from '@/modules/events/lib/queries'
import { db } from '@/lib/db/client'
import { HeroSection } from '@/modules/feed/components/HeroSection'
import { LeftSidebar } from '@/modules/feed/components/LeftSidebar'
import { RightSidebar } from '@/modules/feed/components/RightSidebar'
import { FeedClient } from '@/modules/feed/components/FeedClient'

const PAGE_SIZE = 10

export default async function HomePage() {
  const session = await auth()
  const userId = session?.user?.id ?? null

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
  const nextCursor = hasMore ? initialPage[initialPage.length - 1].createdAt.toISOString() : null

  // Strip internal fields for client
  const initialItems = initialPage.map(({ category, engagementScore, createdAt, ...rest }) => rest)

  const xpData = userId && xpAggregate
    ? {
        totalXp: xpAggregate.totalXp,
        streakDays: xpAggregate.streakDays,
        weeklyXp,
        nextLevelXp: Math.ceil(xpAggregate.totalXp / 100 + 1) * 100,
      }
    : undefined

  return (
    <>
      {!userId && <HeroSection />}

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
