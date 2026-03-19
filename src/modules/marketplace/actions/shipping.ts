'use server'

import { requireAuth } from '@/lib/auth/guards'
import { getShippingEstimates } from '@/modules/marketplace/lib/shipping'
import type { ShippingRate } from '@/modules/marketplace/types'

// ---------------------------------------------------------------------------
// estimateShipping
// ---------------------------------------------------------------------------

/**
 * Returns shipping rate estimates for a listing given the buyer's ZIP code.
 * Thin wrapper over the shared shipping lib — auth-gated server action.
 */
export async function estimateShipping(
  listingId: string,
  toZip: string,
): Promise<ShippingRate[]> {
  await requireAuth()

  return getShippingEstimates(listingId, toZip)
}

// ---------------------------------------------------------------------------
// validateAddress
// ---------------------------------------------------------------------------

/**
 * Basic US ZIP code validation — returns true if valid, false otherwise.
 * Does NOT make any external API call; purely format-based.
 */
export async function validateAddress(zip: string): Promise<{ valid: boolean; zip: string }> {
  await requireAuth()

  const valid = /^\d{5}$/.test(zip)
  return { valid, zip }
}
