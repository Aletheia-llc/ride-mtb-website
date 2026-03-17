import type { Metadata } from 'next'
import { getTrailSystems } from '@/modules/trails/lib/queries'
import { ExploreClient } from './ExploreClient'

export const metadata: Metadata = {
  title: 'Explore Trails | Ride MTB',
  description: 'Browse and filter mountain bike trail systems by type, state, and more.',
}

export default async function ExploreTrailsPage() {
  const systems = await getTrailSystems({})

  const pins = systems
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      systemType: s.systemType,
      city: s.city,
      state: s.state,
      latitude: s.latitude,
      longitude: s.longitude,
      trailCount: s.trailCount,
      totalMiles: s.totalMiles,
      averageRating: s.averageRating,
      reviewCount: s.reviewCount,
    }))

  return <ExploreClient initialSystems={pins} />
}
