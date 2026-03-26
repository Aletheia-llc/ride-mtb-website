'use server'

import { auth } from '@/lib/auth/config'
import { expireListingsInternal } from '@/modules/marketplace/lib/maintenance'

/**
 * Admin-only server action to expire overdue listings.
 * For the cron route, call expireListingsInternal() directly (CRON_SECRET-gated).
 */
export async function expireListings(): Promise<{ expiredCount: number }> {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return expireListingsInternal()
}
