'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

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

    await db.conditionReport.create({ data: { trailId, userId: user.id, condition, notes } })
    // Update current condition on trail
    await db.trail.update({ where: { id: trailId }, data: { currentCondition: condition, conditionReportedAt: new Date() } })
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
