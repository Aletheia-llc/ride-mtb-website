'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopStatus, ClaimStatus } from '@/generated/prisma/client'

// ── approveShop ───────────────────────────────────────────

export async function approveShop(shopId: string): Promise<void> {
  await requireAdmin()
  await db.shop.update({
    where: { id: shopId, status: ShopStatus.PENDING_REVIEW },
    data: { status: ShopStatus.ACTIVE },
  })
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
  revalidatePath('/admin/shops/submissions')
  revalidatePath(`/admin/shops/submissions/${shopId}`)
}

// ── rejectShop ────────────────────────────────────────────

export async function rejectShop(shopId: string): Promise<void> {
  await requireAdmin()
  await db.shop.update({
    where: { id: shopId, status: ShopStatus.PENDING_REVIEW },
    data: { status: ShopStatus.REJECTED },
  })
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
  revalidatePath('/admin/shops/submissions')
  revalidatePath(`/admin/shops/submissions/${shopId}`)
}

// ── approveClaim ──────────────────────────────────────────

export async function approveClaim(claimId: string): Promise<void> {
  await requireAdmin()
  const claim = await db.shopClaimRequest.findUnique({ where: { id: claimId } })
  if (!claim || claim.status !== ClaimStatus.PENDING) return

  await db.$transaction(async (tx) => {
    await tx.shopClaimRequest.update({
      where: { id: claimId },
      data: { status: ClaimStatus.APPROVED },
    })
    await tx.shop.update({
      where: { id: claim.shopId },
      data: { status: ShopStatus.CLAIMED, ownerId: claim.userId },
    })
    // Reject all other pending claims for the same shop
    await tx.shopClaimRequest.updateMany({
      where: { shopId: claim.shopId, id: { not: claimId }, status: ClaimStatus.PENDING },
      data: { status: ClaimStatus.REJECTED },
    })
  })

  revalidatePath('/shops')
  revalidatePath('/admin/shops')
  revalidatePath('/admin/shops/claims')
}

// ── denyClaim ─────────────────────────────────────────────

export async function denyClaim(claimId: string): Promise<void> {
  await requireAdmin()
  await db.shopClaimRequest.update({
    where: { id: claimId },
    data: { status: ClaimStatus.REJECTED },
  })
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
}
