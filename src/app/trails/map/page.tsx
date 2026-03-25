import { Suspense } from 'react'
import { UnifiedMapDynamic } from '@/modules/map'

export const metadata = {
  title: 'Trail Map | Ride MTB',
  description: 'View all mountain bike trails on an interactive map.',
}

export default function TrailMapPage() {
  return (
    <div style={{ height: 'calc(100dvh - 64px)' }}>
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <UnifiedMapDynamic
          defaultLayers={['trails']}
          availableLayers={['trails', 'events', 'coaching']}
          className="h-full"
        />
      </Suspense>
    </div>
  )
}
