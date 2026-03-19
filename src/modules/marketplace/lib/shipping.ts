/**
 * Shipping rate utilities for the marketplace module.
 *
 * Uses a mock rate generator that approximates real carrier pricing based on
 * dimensional weight and zip-code distance. Live carrier rate fetching (e.g.
 * EasyPost/Shippo) is not yet implemented — see the TODO inside
 * getShippingEstimates().
 *
 * Systematic adaptations from standalone:
 *   - `prisma` → `db`
 *   - `'use server'` removed — this is a lib utility, not a server action
 *     (the server action wrapper lives in actions/shipping.ts)
 */

import { db } from '@/lib/db/client'
import type { ShippingRate, ShippingEstimateRequest } from '../types'

// ---------------------------------------------------------------------------
// Mock rate generator
// ---------------------------------------------------------------------------

const FLAT_RATE_ESTIMATED_DAYS = 5

/**
 * Generate plausible shipping rates from dimensional-weight and distance
 * heuristics. Rates are sorted cheapest-first.
 */
export function generateMockRates(params: ShippingEstimateRequest): ShippingRate[] {
  const { fromZip, toZip, weight, length, width, height } = params

  const dimWeight = (length * width * height) / 139
  const billableWeight = Math.max(weight, dimWeight)

  const fromRegion = parseInt(fromZip.slice(0, 1), 10)
  const toRegion = parseInt(toZip.slice(0, 1), 10)
  const distanceFactor = 1 + Math.abs(fromRegion - toRegion) * 0.08

  const round = (n: number) => Math.round(n * 100) / 100

  return [
    {
      id: 'usps-ground-advantage',
      carrier: 'USPS',
      service: 'Ground Advantage',
      rate: round((7.5 + billableWeight * 0.55) * distanceFactor),
      estimatedDays: Math.min(7, Math.max(5, Math.round(3 + distanceFactor * 2))),
    },
    {
      id: 'usps-priority',
      carrier: 'USPS',
      service: 'Priority Mail',
      rate: round((11 + billableWeight * 0.85) * distanceFactor),
      estimatedDays: Math.min(3, Math.max(2, Math.round(1 + distanceFactor))),
    },
    {
      id: 'ups-ground',
      carrier: 'UPS',
      service: 'Ground',
      rate: round((13 + billableWeight * 1.1) * distanceFactor),
      estimatedDays: Math.min(5, Math.max(3, Math.round(2 + distanceFactor * 1.5))),
    },
    {
      id: 'ups-2nd-day-air',
      carrier: 'UPS',
      service: '2nd Day Air',
      rate: round((23 + billableWeight * 1.6) * distanceFactor),
      estimatedDays: 2,
    },
    {
      id: 'fedex-ground',
      carrier: 'FedEx',
      service: 'Ground',
      rate: round((12.5 + billableWeight * 1.05) * distanceFactor),
      estimatedDays: Math.min(5, Math.max(3, Math.round(2 + distanceFactor * 1.5))),
    },
  ].sort((a, b) => a.rate - b.rate)
}

// ---------------------------------------------------------------------------
// Core estimate function (used by server action + API route)
// ---------------------------------------------------------------------------

/**
 * Fetch shipping estimates for a listing given the buyer's destination ZIP.
 *
 * - If the listing has package dimensions, returns carrier-rate estimates.
 * - If the listing has only a flat `shippingCost`, returns that single rate.
 * - Throws a user-facing error for local-only listings or missing dimension data.
 */
export async function getShippingEstimates(
  listingId: string,
  toZip: string,
): Promise<ShippingRate[]> {
  if (!/^\d{5}$/.test(toZip)) {
    throw new Error('Please enter a valid 5-digit ZIP code')
  }

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      fulfillment: true,
      shippingCost: true,
      estimatedWeight: true,
      packageLength: true,
      packageWidth: true,
      packageHeight: true,
      zipCode: true,
    },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (listing.fulfillment === 'local_only') {
    throw new Error('This listing is for local pickup only')
  }

  const hasPackageDimensions =
    listing.estimatedWeight &&
    listing.packageLength &&
    listing.packageWidth &&
    listing.packageHeight

  // TODO: Add EasyPost/Shippo live rate fetch here when EASYPOST_API_KEY is available
  // For now, always returns mock rates

  // Seller set a flat shipping cost but no dimensions — return single flat rate
  if (!hasPackageDimensions && listing.shippingCost !== null) {
    const flatCost = Number(listing.shippingCost)
    return [
      {
        id: 'flat-rate',
        carrier: 'Seller',
        service: 'Flat Rate Shipping',
        rate: flatCost,
        estimatedDays: FLAT_RATE_ESTIMATED_DAYS,
      },
    ]
  }

  if (!hasPackageDimensions) {
    throw new Error(
      "This listing doesn't have package dimensions or a flat shipping cost set",
    )
  }

  const fromZip = listing.zipCode
  if (!fromZip) {
    throw new Error('Seller has not set a location ZIP code for this listing')
  }

  return generateMockRates({
    fromZip,
    toZip,
    weight: Number(listing.estimatedWeight),
    length: listing.packageLength!,
    width: listing.packageWidth!,
    height: listing.packageHeight!,
  })
}
