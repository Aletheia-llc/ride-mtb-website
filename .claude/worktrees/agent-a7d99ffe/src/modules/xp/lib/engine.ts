import 'server-only'
import { db } from '@/lib/db/client'
import { XP_VALUES, STREAK_MULTIPLIERS } from '@/shared/constants/xp-values'
import type { XpEvent, XpModule, XpGrantResult } from '@/shared/types/xp'

export interface GrantXPInput {
  userId: string
  event: XpEvent
  module: XpModule
  refId: string
}

function getStreakMultiplier(streakDays: number): number {
  let multiplier = 1.0
  for (const [threshold, mult] of Object.entries(STREAK_MULTIPLIERS)) {
    if (streakDays >= Number(threshold)) multiplier = mult
  }
  return multiplier
}

export async function grantXP(input: GrantXPInput): Promise<XpGrantResult> {
  const { userId, event, module, refId } = input

  const basePoints = XP_VALUES[event]
  if (typeof basePoints !== 'number') {
    throw new Error(`Unknown XP event: ${event}`)
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const aggregate = await tx.xpAggregate.findUnique({ where: { userId } })
      const streakMultiplier = getStreakMultiplier(aggregate?.streakDays ?? 0)
      const total = Math.round(basePoints * streakMultiplier)

      await tx.xpGrant.create({
        data: { userId, event, module, points: basePoints, multiplier: streakMultiplier, total, refId },
      })

      await tx.$executeRaw`
        INSERT INTO xp_aggregates (id, "userId", "totalXp", "moduleBreakdown", "streakDays", "lastGrantAt", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, ${total}, jsonb_build_object(${module}::text, ${total}), 0, NOW(), NOW())
        ON CONFLICT ("userId") DO UPDATE SET
          "totalXp" = xp_aggregates."totalXp" + ${total},
          "moduleBreakdown" = xp_aggregates."moduleBreakdown" ||
            jsonb_build_object(${module}::text,
              COALESCE((xp_aggregates."moduleBreakdown"->>${module})::int, 0) + ${total}),
          "lastGrantAt" = NOW(),
          "updatedAt" = NOW()
      `

      const updated = await tx.xpAggregate.findUnique({ where: { userId } })
      return { granted: true, points: total, newTotal: updated?.totalXp ?? total }
    })

    return result
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
