'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  orgName: z.string().min(1).max(200),
  bio: z.string().max(1000).optional(),
  websiteUrl: z.string().url().optional(),
})

export type OrganizerState = { errors: Record<string, string>; success?: boolean }

export async function createOrganizerProfile(_prev: OrganizerState, formData: FormData): Promise<OrganizerState> {
  try {
    const user = await requireAuth()
    const existing = await db.organizerProfile.findUnique({ where: { userId: user.id } })
    if (existing) return { errors: { general: 'You already have an organizer profile' } }
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid' } }
    await db.organizerProfile.create({ data: { ...parsed.data, userId: user.id } })
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
