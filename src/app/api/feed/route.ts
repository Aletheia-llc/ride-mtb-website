// src/app/api/feed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
/* eslint-disable no-restricted-imports */
import { getFeedCandidates } from '@/modules/feed/lib/queries'
import { scoreFeedItems, getBehaviorScores } from '@/modules/feed/lib/personalization'
import type { FeedTab } from '@/modules/feed/types'
/* eslint-enable no-restricted-imports */

const PAGE_SIZE = 10

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = request.nextUrl
    const tab = (searchParams.get('tab') ?? 'forYou') as FeedTab
    const pageParam = searchParams.get('page')
    const currentPage = pageParam ? parseInt(pageParam, 10) : 1

    const candidates = await getFeedCandidates(currentPage)

    let rankedItems = candidates

    if (tab === 'forYou' && session?.user?.id) {
      const [behaviorScores, user] = await Promise.all([
        getBehaviorScores(session.user.id),
        import('@/lib/db/client').then(({ db }) =>
          db.user.findUnique({
            where: { id: session.user.id },
            select: { interests: true, skillLevel: true, ridingStyle: true, location: true },
          }),
        ),
      ])

      if (user) {
        const scored = scoreFeedItems(candidates, {
          interests: user.interests,
          skillLevel: user.skillLevel as string | null,
          ridingStyle: user.ridingStyle ?? null,
          location: user.location ?? null,
        }, behaviorScores)
        rankedItems = scored
      }
    } else if (tab === 'latest') {
      rankedItems = [...candidates].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )
    } else if (tab === 'popular') {
      rankedItems = [...candidates].sort(
        (a, b) => b.engagementScore - a.engagementScore,
      )
    }

    const page = rankedItems.slice(0, PAGE_SIZE)
    const hasMore = rankedItems.length > PAGE_SIZE
    const nextCursor = hasMore ? String(currentPage + 1) : null

    const items = page.map(({ category, engagementScore, createdAt, ...rest }) => {
      if (tab !== 'forYou') {
        const { reason, ...noReason } = rest
        return noReason
      }
      return rest
    })

    return NextResponse.json({ items, nextCursor, hasMore })
  } catch (err) {
    console.error('[api/feed]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
