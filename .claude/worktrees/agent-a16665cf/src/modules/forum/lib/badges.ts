import 'server-only'
import { db } from '@/lib/db/client'

type BadgeContext = 'post' | 'thread' | 'vote'

interface BadgeCheck {
  slug: string
  condition: (data: {
    postCount: number
    threadCount: number
    karma: number
    accountAgeDays: number
  }) => boolean
}

const BADGE_CHECKS: BadgeCheck[] = [
  { slug: 'first-post',   condition: ({ postCount })      => postCount >= 1 },
  { slug: '10-posts',     condition: ({ postCount })      => postCount >= 10 },
  { slug: '50-posts',     condition: ({ postCount })      => postCount >= 50 },
  { slug: '100-posts',    condition: ({ postCount })      => postCount >= 100 },
  { slug: 'first-thread', condition: ({ threadCount })    => threadCount >= 1 },
  { slug: 'helpful',      condition: ({ karma })          => karma >= 10 },
  { slug: 'popular',      condition: ({ karma })          => karma >= 50 },
  { slug: 'month-old',    condition: ({ accountAgeDays }) => accountAgeDays >= 30 },
]

export async function checkAndGrantBadges(
  userId: string,
  _context: BadgeContext,
): Promise<void> {
  const [postCount, threadCount, user] = await Promise.all([
    db.forumPost.count({
      where: { authorId: userId, deletedAt: null },
    }),
    db.forumThread.count({
      where: {
        posts: { some: { authorId: userId, isFirst: true } },
        deletedAt: null,
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { karma: true, createdAt: true },
    }),
  ])

  if (!user) return

  const karma = user.karma
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )

  const data = { postCount, threadCount, karma, accountAgeDays }

  await Promise.all(
    BADGE_CHECKS
      .filter(({ condition }) => condition(data))
      .map(({ slug }) =>
        db.forumUserBadge.upsert({
          where: { userId_badgeSlug: { userId, badgeSlug: slug } },
          create: { userId, badgeSlug: slug },
          update: {},
        }),
      ),
  )
}
