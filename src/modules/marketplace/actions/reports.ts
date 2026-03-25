'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth, requireAdmin } from '@/lib/auth/guards'

// ---------------------------------------------------------------------------
// Report a listing
// ---------------------------------------------------------------------------

export async function reportListing(
  listingId: string,
  reason: string,
  details?: string,
): Promise<void> {
  const user = await requireAuth()

  if (!reason?.trim()) {
    throw new Error('A reason is required to report a listing')
  }

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  // Prevent duplicate pending reports from the same user
  const existing = await db.listingReport.findFirst({
    where: {
      listingId,
      reporterId: user.id,
      resolved: false,
    },
    select: { id: true },
  })

  if (existing) {
    throw new Error('You have already reported this listing')
  }

  await db.listingReport.create({
    data: {
      listingId,
      reporterId: user.id,
      reason: reason.trim(),
      body: details?.trim() ?? null,
    },
  })

  revalidatePath('/admin/marketplace/reports')
}

// ---------------------------------------------------------------------------
// Get all pending reports (admin only)
// ---------------------------------------------------------------------------

export async function getReports() {
  await requireAdmin()

  const reports = await db.listingReport.findMany({
    where: { resolved: false },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
        },
      },
      reporter: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return reports
}

// ---------------------------------------------------------------------------
// Resolve a report (admin only)
// ---------------------------------------------------------------------------

export async function resolveReport(reportId: string, action: string): Promise<void> {
  await requireAdmin()

  const report = await db.listingReport.findUnique({
    where: { id: reportId },
    select: { id: true, resolved: true, listingId: true },
  })

  if (!report) {
    throw new Error('Report not found')
  }

  if (report.resolved) {
    throw new Error('Report is already resolved')
  }

  await db.listingReport.update({
    where: { id: reportId },
    data: { resolved: true },
  })

  // If action is to remove the listing, update it
  if (action === 'remove_listing') {
    const listing = await db.listing.findUnique({
      where: { id: report.listingId },
      select: { slug: true },
    })

    await db.listing.update({
      where: { id: report.listingId },
      data: { status: 'removed' },
    })

    if (listing) {
      revalidatePath(`/buy-sell/${listing.slug}`)
      revalidatePath('/buy-sell')
    }
  }

  revalidatePath('/admin/marketplace/reports')
}
