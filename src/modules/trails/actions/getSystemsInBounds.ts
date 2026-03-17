'use server'
import { getTrailSystemsInBounds } from '@/modules/trails/lib/queries'

export async function getSystemsInBoundsAction(
  bounds: { ne: [number, number]; sw: [number, number] },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filters?: { type?: string },
) {
  // Basic validation — protect against NaN/Infinity from client
  const [neLng, neLat] = bounds.ne
  const [swLng, swLat] = bounds.sw
  if (!isFinite(neLng) || !isFinite(neLat) || !isFinite(swLng) || !isFinite(swLat)) {
    return []
  }
  return getTrailSystemsInBounds(neLat, neLng, swLat, swLng)
}
