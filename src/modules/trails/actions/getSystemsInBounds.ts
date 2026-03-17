'use server'
import { getTrailSystemsInBounds } from '@/modules/trails/lib/queries'

export async function getSystemsInBoundsAction(
  bounds: { ne: [number, number]; sw: [number, number] },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filters?: { type?: string },
) {
  return getTrailSystemsInBounds(
    bounds.ne[1], // neLat
    bounds.ne[0], // neLng
    bounds.sw[1], // swLat
    bounds.sw[0], // swLng
  )
}
