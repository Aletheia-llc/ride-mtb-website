import 'server-only'
import { db } from '@/lib/db/client'
import { createNotification } from '@/lib/notifications'

interface BadgeRule {
  slug: string
  check: (counts: BadgeCounts) => boolean
}

interface BadgeCounts {
  postCount: number
  commentCount: number
  trailReviewCount: number
  conditionReportCount: number
  gpxUploadCount: number
  rideCount: number
  quizCount: number
  certCount: number
  totalXp: number
  streakDays: number
}

const BADGE_RULES: BadgeRule[] = [
  // Forum
  { slug: 'first-post', check: (c) => c.postCount >= 1 },
  { slug: 'ten-posts', check: (c) => c.postCount >= 10 },
  { slug: 'first-comment', check: (c) => c.commentCount >= 1 },
  // Trails
  { slug: 'trail-reviewer', check: (c) => c.trailReviewCount >= 1 },
  { slug: 'trail-scout', check: (c) => c.conditionReportCount >= 5 },
  { slug: 'cartographer', check: (c) => c.gpxUploadCount >= 1 },
  // Rides
  { slug: 'first-ride', check: (c) => c.rideCount >= 1 },
  { slug: 'ten-rides', check: (c) => c.rideCount >= 10 },
  { slug: 'fifty-rides', check: (c) => c.rideCount >= 50 },
  // Learn
  { slug: 'first-quiz', check: (c) => c.quizCount >= 1 },
  { slug: 'certified', check: (c) => c.certCount >= 1 },
  // XP milestones
  { slug: 'xp-100', check: (c) => c.totalXp >= 100 },
  { slug: 'xp-1000', check: (c) => c.totalXp >= 1000 },
  { slug: 'xp-5000', check: (c) => c.totalXp >= 5000 },
  // Streaks
  { slug: 'week-streak', check: (c) => c.streakDays >= 7 },
  { slug: 'month-streak', check: (c) => c.streakDays >= 30 },
]

async function getCounts(userId: string): Promise<BadgeCounts> {
  const [
    postCount,
    commentCount,
    trailReviewCount,
    conditionReportCount,
    gpxUploadCount,
    rideCount,
    quizCount,
    certCount,
    xpAgg,
  ] = await Promise.all([
    db.post.count({ where: { authorId: userId, deletedAt: null } }).catch(() => 0),
    db.comment.count({ where: { authorId: userId, deletedAt: null } }).catch(() => 0),
    db.trailReview.count({ where: { userId } }).catch(() => 0),
    db.conditionReport.count({ where: { userId } }).catch(() => 0),
    db.xpGrant.count({ where: { userId, event: 'trail_gpx_contributed' } }).catch(() => 0),
    db.rideLog.count({ where: { userId } }).catch(() => 0),
    db.learnProgress.count({ where: { userId } }).catch(() => 0),
    db.learnCertificate.count({ where: { userId } }).catch(() => 0),
    db.xpAggregate.findUnique({ where: { userId }, select: { totalXp: true, streakDays: true } }),
  ])

  return {
    postCount,
    commentCount,
    trailReviewCount,
    conditionReportCount,
    gpxUploadCount,
    rideCount,
    quizCount,
    certCount,
    totalXp: xpAgg?.totalXp ?? 0,
    streakDays: xpAgg?.streakDays ?? 0,
  }
}

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const [counts, allBadges, existingBadgeIds] = await Promise.all([
    getCounts(userId),
    db.badge.findMany({
      where: { slug: { in: BADGE_RULES.map((r) => r.slug) } },
      select: { id: true, slug: true, name: true },
    }),
    db.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    }).then((rows) => new Set(rows.map((r) => r.badgeId))),
  ])

  const badgeMap = new Map(allBadges.map((b) => [b.slug, b]))
  const awarded: string[] = []

  for (const rule of BADGE_RULES) {
    if (!rule.check(counts)) continue

    const badge = badgeMap.get(rule.slug)
    if (!badge || existingBadgeIds.has(badge.id)) continue

    try {
      await db.userBadge.create({ data: { userId, badgeId: badge.id } })
      awarded.push(badge.name)
      void createNotification(
        userId,
        'badge_awarded',
        `Badge Earned: ${badge.name}`,
        `You've earned the "${badge.name}" badge!`,
        '/profile',
      )
    } catch {
      // Race condition — already has badge
    }
  }

  return awarded
}
