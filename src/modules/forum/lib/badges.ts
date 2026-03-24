import 'server-only'
import { db } from '@/lib/db/client'

const BADGES = [
  { slug: 'first-post',    threshold: 1,  model: 'post'    as const },
  { slug: 'ten-posts',     threshold: 10, model: 'post'    as const },
  { slug: 'first-comment', threshold: 1,  model: 'comment' as const },
] as const

export async function checkAndAwardBadges(userId: string): Promise<void> {
  const [postCount, commentCount] = await Promise.all([
    db.post.count({ where: { authorId: userId, deletedAt: null } }),
    db.comment.count({ where: { authorId: userId, deletedAt: null } }),
  ])

  for (const badge of BADGES) {
    const count = badge.model === 'post' ? postCount : commentCount
    if (count < badge.threshold) continue

    const badgeRecord = await db.badge.findUnique({
      where: { slug: badge.slug },
      select: { id: true },
    })
    if (!badgeRecord) continue

    await db.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badgeRecord.id } },
      update: {},
      create: { userId, badgeId: badgeRecord.id },
    })
  }
}
