/**
 * Seller trust score calculator.
 *
 * Pure function — no DB calls. Accepts pre-fetched seller data and returns
 * a TrustLevel string used across the marketplace UI and seller profiles.
 *
 * Trust tiers:
 *   power       — 50+ sales, avg rating ≥ 4.7
 *   trusted     — 10+ sales, avg rating ≥ 4.5, identity verified
 *   established — 3+ sales, avg rating ≥ 4.0
 *   new         — everyone else
 */

import type { TrustLevel } from '../types'

/**
 * Calculate the trust level for a seller based on their profile metrics.
 *
 * @param totalSales    Number of completed sales
 * @param averageRating Average star rating (1–5), or null if no reviews yet
 * @param isVerified    Whether the seller's identity has been verified
 * @returns TrustLevel string
 */
export function calculateTrustLevel(
  totalSales: number,
  averageRating: number | null,
  isVerified: boolean,
): TrustLevel {
  const rating = averageRating ?? 0

  if (totalSales >= 50 && rating >= 4.7) {
    return 'power'
  }
  if (totalSales >= 10 && rating >= 4.5 && isVerified) {
    return 'trusted'
  }
  if (totalSales >= 3 && rating >= 4.0) {
    return 'established'
  }
  return 'new'
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Human-readable label for each trust tier. */
export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  new: 'New Seller',
  established: 'Established',
  trusted: 'Trusted Seller',
  power: 'Power Seller',
}

/** Tailwind CSS color class for each trust tier badge. */
export const TRUST_LEVEL_COLORS: Record<TrustLevel, string> = {
  new: 'text-gray-500',
  established: 'text-blue-600',
  trusted: 'text-green-600',
  power: 'text-yellow-500',
}
