'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ClaimStatus } from '@/generated/prisma/client'

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

    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { ownerId: true } })
    if (!shop) return { errors: { general: 'Shop not found' } }
    if (shop.ownerId) return { errors: { general: 'This shop already has an owner' } }

    const existing = await db.shopClaimRequest.findUnique({
      where: { shopId_userId: { shopId, userId: user.id } },
      select: { status: true },
    })
    if (existing?.status === ClaimStatus.PENDING || existing?.status === ClaimStatus.APPROVED) {
      return { errors: { general: 'You already have a pending or approved claim for this shop' } }
    }
    if (existing?.status === ClaimStatus.REJECTED) {
      return { errors: { general: 'Your previous claim was rejected. Please contact an admin.' } }
    }

    await db.shopClaimRequest.create({
      data: { shopId, userId: user.id, businessRole, proofDetail },
    })

    revalidatePath('/shops')
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
