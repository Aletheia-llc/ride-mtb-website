import 'server-only'
import { db } from '@/lib/db/client'
import { XP_VALUES, STREAK_MULTIPLIERS } from '@/shared/constants/xp-values'
import type { XpEvent, XpModule, XpGrantResult } from '@/shared/types/xp'
import { createNotification } from '@/lib/notifications'
import { checkAndAwardBadges } from '@/lib/badges'

const XP_MILESTONES = [100, 500, 1000, 5000, 10000] as const

export interface GrantXPInput {
  userId: string
  event: XpEvent
  module: XpModule
  refId: string
}

const STREAK_MILESTONES = [3, 7, 14, 30] as const

function getStreakMultiplier(streakDays: number): number {
  let multiplier = 1.0
  for (const [threshold, mult] of Object.entries(STREAK_MULTIPLIERS)) {
    if (streakDays >= Number(threshold)) multiplier = mult
  }
  return multiplier
}

function computeNewStreak(lastGrantAt: Date | null, currentStreak: number): number {
  if (!lastGrantAt) return 1

  const now = new Date()
  const todayUTC = now.toISOString().slice(0, 10)
  const lastDateUTC = lastGrantAt.toISOString().slice(0, 10)

  if (lastDateUTC === todayUTC) {
    // Already earned XP today — streak unchanged
    return currentStreak
  }

  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayUTC = yesterday.toISOString().slice(0, 10)

  if (lastDateUTC === yesterdayUTC) {
    // Consecutive day — increment streak
    return currentStreak + 1
  }

  // Gap of 2+ days — reset
  return 1
}

export async function grantXP(input: GrantXPInput): Promise<XpGrantResult> {
  const { userId, event, module, refId } = input

  const basePoints = XP_VALUES[event]
  if (typeof basePoints !== 'number') {
    throw new Error(`Unknown XP event: ${event}`)
  }

  try {
    const { granted, points, newTotal, newStreak } = await db.$transaction(async (tx) => {
      const aggregate = await tx.xpAggregate.findUnique({ where: { userId } })

      const newStreak = computeNewStreak(
        aggregate?.lastGrantAt ?? null,
        aggregate?.streakDays ?? 0,
      )
      const streakMultiplier = getStreakMultiplier(newStreak)
      const total = Math.round(basePoints * streakMultiplier)

      await tx.xpGrant.create({
        data: { userId, event, module, points: basePoints, multiplier: streakMultiplier, total, refId },
      })

      await tx.$executeRaw`
        INSERT INTO xp_aggregates (id, "userId", "totalXp", "moduleBreakdown", "streakDays", "lastGrantAt", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, ${total}, jsonb_build_object(${module}::text, ${total}), ${newStreak}, NOW(), NOW())
        ON CONFLICT ("userId") DO UPDATE SET
          "totalXp" = xp_aggregates."totalXp" + ${total},
          "moduleBreakdown" = xp_aggregates."moduleBreakdown" ||
            jsonb_build_object(${module}::text,
              COALESCE((xp_aggregates."moduleBreakdown"->>${module})::int, 0) + ${total}),
          "streakDays" = ${newStreak},
          "lastGrantAt" = NOW(),
          "updatedAt" = NOW()
      `

      const updated = await tx.xpAggregate.findUnique({ where: { userId } })
      return { granted: true, points: total, newTotal: updated?.totalXp ?? total, newStreak }
    })

    // Award streak milestone bonus (idempotent via unique refId)
    if (STREAK_MILESTONES.includes(newStreak as typeof STREAK_MILESTONES[number])) {
      const year = new Date().getUTCFullYear()
      const bonusRefId = `streak_${newStreak}_${year}`
      const bonusPoints = XP_VALUES.streak_bonus

      try {
        await db.xpGrant.create({
          data: {
            userId,
            event: 'streak_bonus',
            module: 'forum',
            points: bonusPoints,
            multiplier: 1.0,
            total: bonusPoints,
            refId: bonusRefId,
          },
        })
        await db.$executeRaw`
          UPDATE xp_aggregates SET
            "totalXp" = "totalXp" + ${bonusPoints},
            "moduleBreakdown" = "moduleBreakdown" ||
              jsonb_build_object('forum'::text,
                COALESCE(("moduleBreakdown"->>'forum')::int, 0) + ${bonusPoints}),
            "updatedAt" = NOW()
          WHERE "userId" = ${userId}
        `
      } catch {
        // Duplicate — bonus already granted for this milestone this year
      }
    }

    // Check for XP milestones and notify
    let milestoneReached: number | undefined
    if (granted) {
      const oldTotal = newTotal - points
      for (const milestone of XP_MILESTONES) {
        if (oldTotal < milestone && newTotal >= milestone) {
          milestoneReached = milestone
          void createNotification(
            userId,
            'xp_milestone',
            `${milestone.toLocaleString()} XP Reached!`,
            `You've earned ${milestone.toLocaleString()} XP on Ride MTB`,
            '/profile/settings',
          )
          break
        }
      }
    }

    // Check for new badges after XP grant
    if (granted) {
      void checkAndAwardBadges(userId)
    }

    return { granted, points, newTotal, streakDays: newStreak, milestoneReached }
  } catch (error: unknown) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const existing = await db.xpAggregate.findUnique({ where: { userId } })
      return { granted: false, points: 0, newTotal: existing?.totalXp ?? 0 }
    }
    throw error
  }
}

export async function resetExpiredStreaks(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000) // 30 hours ago

  const result = await db.xpAggregate.updateMany({
    where: {
      streakDays: { gt: 0 },
      lastGrantAt: { lt: cutoff },
    },
    data: {
      streakDays: 0,
    },
  })

  return result.count
}
