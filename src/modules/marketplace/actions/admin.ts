'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'

// ---------------------------------------------------------------------------
// getAdminDashboard
// ---------------------------------------------------------------------------

/**
 * Returns high-level counts for the admin dashboard.
 * Admin-only.
 */
export async function getAdminDashboard() {
  await requireAdmin()

  const [pendingListings, activeListings, openReports, totalTransactions] =
    await Promise.all([
      db.listing.count({ where: { status: 'pending_review' } }),
      db.listing.count({ where: { status: 'active' } }),
      db.listingReport.count({ where: { resolved: false } }),
      db.transaction.count(),
    ])

  return {
    pendingListings,
    activeListings,
    openReports,
    totalTransactions,
  }
}

// ---------------------------------------------------------------------------
// approveListings
// ---------------------------------------------------------------------------

/**
 * Sets a listing's status to 'active', making it visible in the marketplace.
 * Admin-only.
 */
export async function approveListings(listingId: string) {
  await requireAdmin()

  const listing = await db.listing.update({
    where: { id: listingId },
    data: { status: 'active' },
    include: {
      photos: { take: 1, orderBy: { sortOrder: 'asc' } },
      seller: { select: { id: true, name: true } },
    },
  })

  revalidatePath('/buy-sell')
  revalidatePath(`/buy-sell/${listing.slug}`)
  revalidatePath('/admin/marketplace')

  return listing
}

// ---------------------------------------------------------------------------
// removeListings
// ---------------------------------------------------------------------------

/**
 * Sets a listing's status to 'removed' with a reason.
 * Admin-only.
 */
export async function removeListings(listingId: string, reason: string) {
  await requireAdmin()

  const listing = await db.listing.update({
    where: { id: listingId },
    data: {
      status: 'removed',
      // Store removal reason in a dedicated field if it exists, else silently skip.
      // The schema may add a `removalReason` field in a future migration.
    },
    include: {
      photos: { take: 1, orderBy: { sortOrder: 'asc' } },
      seller: { select: { id: true, name: true } },
    },
  })

  revalidatePath('/buy-sell')
  revalidatePath(`/buy-sell/${listing.slug}`)
  revalidatePath('/admin/marketplace')

  return { listing, reason }
}

// ---------------------------------------------------------------------------
// getReviewQueue
// ---------------------------------------------------------------------------

/**
 * Returns all listings in 'pending_review' status for admin moderation.
 * Admin-only.
 */
export async function getReviewQueue() {
  await requireAdmin()

  return db.listing.findMany({
    where: { status: 'pending_review' },
    include: {
      photos: { take: 1, orderBy: { sortOrder: 'asc' } },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          sellerProfile: {
            select: { isTrusted: true, totalSales: true },
          },
        },
      },
      reports: {
        where: { resolved: false },
        select: { id: true, reason: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ---------------------------------------------------------------------------
// getAdminTransactions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// updateSellerTrust
// ---------------------------------------------------------------------------

/**
 * Sets isTrusted on a seller profile.
 * Trusted sellers have their new listings auto-approved.
 * Admin-only.
 */
export async function updateSellerTrust(
  sellerId: string,
  isTrusted: boolean,
): Promise<void> {
  await requireAdmin()

  await db.sellerProfile.update({
    where: { id: sellerId },
    data: { isTrusted },
  })

  revalidatePath('/buy-sell/admin/sellers')
}

// ---------------------------------------------------------------------------
// getAdminTransactions
// ---------------------------------------------------------------------------

/**
 * Returns all transactions with full details for admin review.
 * Admin-only.
 */
export async function getAdminTransactions() {
  await requireAdmin()

  return db.transaction.findMany({
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          photos: { take: 1, orderBy: { sortOrder: 'asc' } },
        },
      },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
