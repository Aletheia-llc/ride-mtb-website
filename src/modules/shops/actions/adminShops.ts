'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopStatus, ClaimStatus } from '@/generated/prisma/client'
import { sendClaimApprovedEmail, sendClaimDeniedEmail, sendShopApprovedEmail, sendShopRejectedEmail } from '@/lib/email/shop-notifications'

// ── approveShop ───────────────────────────────────────────

export async function approveShop(shopId: string): Promise<void> {
  await requireAdmin()
  const shop = await db.shop.update({
    where: { id: shopId, status: ShopStatus.PENDING_REVIEW },
    data: { status: ShopStatus.ACTIVE },
    include: { submittedBy: { select: { email: true } } },
  })
  if (shop.submittedBy?.email) {
    sendShopApprovedEmail(shop.submittedBy.email, shop.name, shop.slug).catch(() => {})
  }
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
  revalidatePath('/admin/shops/submissions')
  revalidatePath(`/admin/shops/submissions/${shopId}`)
}

// ── rejectShop ────────────────────────────────────────────

export async function rejectShop(shopId: string): Promise<void> {
  await requireAdmin()
  const shop = await db.shop.update({
    where: { id: shopId, status: ShopStatus.PENDING_REVIEW },
    data: { status: ShopStatus.REJECTED },
    include: { submittedBy: { select: { email: true } } },
  })
  if (shop.submittedBy?.email) {
    sendShopRejectedEmail(shop.submittedBy.email, shop.name).catch(() => {})
  }
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
  revalidatePath('/admin/shops/submissions')
  revalidatePath(`/admin/shops/submissions/${shopId}`)
}

// ── approveClaim ──────────────────────────────────────────

export async function approveClaim(claimId: string): Promise<void> {
  await requireAdmin()
  const claim = await db.shopClaimRequest.findUnique({
    where: { id: claimId },
    include: { user: { select: { email: true } }, shop: { select: { name: true, slug: true } } },
  })
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
    await tx.shopClaimRequest.updateMany({
      where: { shopId: claim.shopId, id: { not: claimId }, status: ClaimStatus.PENDING },
      data: { status: ClaimStatus.REJECTED },
    })
  })

  if (claim.user?.email) {
    sendClaimApprovedEmail(claim.user.email, claim.shop.name, claim.shop.slug).catch(() => {})
  }

  revalidatePath('/shops')
  revalidatePath('/admin/shops')
  revalidatePath('/admin/shops/claims')
}

// ── denyClaim ─────────────────────────────────────────────

export async function denyClaim(claimId: string): Promise<void> {
  await requireAdmin()
  const claim = await db.shopClaimRequest.update({
    where: { id: claimId },
    data: { status: ClaimStatus.REJECTED },
    include: { user: { select: { email: true } }, shop: { select: { name: true } } },
  })
  if (claim.user?.email) {
    sendClaimDeniedEmail(claim.user.email, claim.shop.name).catch(() => {})
  }
  revalidatePath('/shops')
  revalidatePath('/admin/shops')
}
