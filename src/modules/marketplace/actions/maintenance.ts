'use server'

import { db } from '@/lib/db/client'

// ---------------------------------------------------------------------------
// expireListings
// ---------------------------------------------------------------------------

/**
 * Batch-expires listings whose `expiresAt` timestamp is in the past and
 * whose status is still 'active'. Intended to be called by the cron job
 * at /api/cron/marketplace-expire on a scheduled basis.
 *
 * Returns the count of listings that were expired.
 */
export async function expireListings(): Promise<{ expiredCount: number }> {
  const result = await db.listing.updateMany({
    where: {
      status: 'active',
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: 'expired',
    },
  })

  return { expiredCount: result.count }
}
