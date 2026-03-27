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
    where: { id: shopId },
    data: { status: ShopStatus.ACTIVE },
  })
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
}

// ── rejectShop ────────────────────────────────────────────
// Note: ShopStatus has no REJECTED value in schema — DRAFT is used to
// pull the shop back from review without publishing it.

export async function rejectShop(shopId: string): Promise<void> {
  await requireAdmin()
  await db.shop.update({
    where: { id: shopId },
    data: { status: ShopStatus.DRAFT },
  })
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
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
  })

  revalidatePath('/shops')
  revalidatePath('/admin/shops')
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
