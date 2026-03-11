import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/ui/components'
// eslint-disable-next-line no-restricted-imports
import { getTrailSystems } from '@/modules/trails/lib/queries'

const TrailMap = dynamic(
  () =>
    import('@/modules/trails/components/TrailMap').then((m) => ({
      default: m.TrailMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg)]">
        <Skeleton variant="map" className="h-full w-full" />
      </div>
    ),
  },
)

export const metadata: Metadata = {
  title: 'Trail Map | Ride MTB',
  description:
    'View all mountain bike trails on an interactive map.',
}

export default async function TrailMapPage() {
  const systems = await getTrailSystems()

  // Compute a reasonable center from all systems with coordinates
  const systemsWithCoords = systems.filter(
    (s) => s.latitude != null && s.longitude != null,
  )

  const center: [number, number] | undefined =
    systemsWithCoords.length > 0
      ? [
          systemsWithCoords.reduce((sum, s) => sum + s.longitude!, 0) /
            systemsWithCoords.length,
          systemsWithCoords.reduce((sum, s) => sum + s.latitude!, 0) /
            systemsWithCoords.length,
        ]
      : undefined

  return (
    <div className="h-screen w-full">
      <TrailMap
        center={center}
        zoom={6}
        className="h-full w-full"
      />
    </div>
  )
}
