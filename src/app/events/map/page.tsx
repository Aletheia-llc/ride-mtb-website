import { Suspense } from 'react'
import { UnifiedMapDynamic } from '@/modules/map'

export const metadata = { title: 'Events Map | Ride MTB' }

export default function EventsMapPage() {
  return (
    <div className="h-[calc(100vh_-_var(--nav-height))]">
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <UnifiedMapDynamic
          defaultLayers={['events']}
          availableLayers={['trails', 'events', 'coaching']}
          className="h-full"
        />
      </Suspense>
    </div>
  )
}
