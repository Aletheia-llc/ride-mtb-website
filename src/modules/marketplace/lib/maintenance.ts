import 'server-only'
import { db } from '@/lib/db/client'

/**
 * Batch-expires listings whose `expiresAt` timestamp is in the past.
 * Called by both the cron route (CRON_SECRET-gated) and the admin server
 * action (role-gated). Authorization is the caller's responsibility.
 */
export async function expireListingsInternal(): Promise<{ expiredCount: number }> {
  const result = await db.listing.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  })
  return { expiredCount: result.count }
}
