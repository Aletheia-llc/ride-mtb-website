'use server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const schema = z.object({
  shopId: z.string().min(1),
  businessRole: z.enum(['Owner', 'Manager', 'Employee']),
  proofDetail: z.string().min(10).max(1000),
})

export type ClaimState = { errors: Record<string, string>; success?: boolean }

export async function claimShop(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }
    const { shopId, businessRole, proofDetail } = parsed.data

    const existing = await db.shopClaimRequest.findUnique({
      where: { shopId_userId: { shopId, userId: user.id } },
    })
    if (existing) {
      return { errors: { general: 'You already have a pending claim for this shop' } }
    }

    await db.shopClaimRequest.create({
      data: { shopId, userId: user.id, businessRole, proofDetail },
    })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
