'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { grantXP } from '@/modules/xp/lib/engine'
import { createNotification } from '@/lib/notifications'

const schema = z.object({
  trailId: z.string().min(1),
  condition: z.enum(['DRY', 'TACKY', 'HERO_DIRT', 'DUSTY', 'MUDDY', 'WET', 'SOFT', 'SNOWY', 'ICY', 'CLOSED']),
  notes: z.string().max(500).optional(),
})

export type ConditionState = { errors: Record<string, string>; success?: boolean }

export async function reportCondition(_prev: ConditionState, formData: FormData): Promise<ConditionState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid' } }
    const { trailId, condition, notes } = parsed.data

    const report = await db.conditionReport.create({ data: { trailId, userId: user.id, condition, notes } })
    const trail = await db.trail.update({
      where: { id: trailId },
      data: { currentCondition: condition, conditionReportedAt: new Date() },
      select: { name: true, slug: true, system: { select: { slug: true } } },
    })
    void grantXP({ userId: user.id, event: 'trail_condition_reported', module: 'trails', refId: report.id })

    // Notify users who favorited this trail
    const favorites = await db.trailFavorite.findMany({
      where: { trailId, userId: { not: user.id } },
      select: { userId: true },
      take: 50,
    })
    const trailUrl = `/trails/explore/${trail.system?.slug}/${trail.slug}`
    for (const fav of favorites) {
      void createNotification(
        fav.userId,
        'trail_condition',
        `${trail.name}: ${condition.replace('_', ' ').toLowerCase()}`,
        `A rider reported ${condition.replace('_', ' ').toLowerCase()} conditions`,
        trailUrl,
      )
    }

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
