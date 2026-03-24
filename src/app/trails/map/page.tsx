import { Suspense } from 'react'
import { getTrailSystems } from '@/modules/trails/lib/queries'
import { SystemClusterMapDynamic } from '@/modules/trails/components'

export const metadata = {
  title: 'Trail Map | Ride MTB',
  description: 'View all mountain bike trails on an interactive map.',
}

export default async function TrailMapPage() {
  const systems = await getTrailSystems({})
  const pins = systems
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      city: s.city ?? '',
      state: s.state ?? '',
      latitude: s.latitude!,
      longitude: s.longitude!,
      trailCount: s._count.trails,
      averageRating: s.averageRating ?? null,
    }))

  return (
    <div className="h-[calc(100vh_-_var(--nav-height))]">
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <SystemClusterMapDynamic
          systems={pins}
          className="h-full"
        />
      </Suspense>
    </div>
  )
}
