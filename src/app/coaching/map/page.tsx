import { Suspense } from 'react'
import { UnifiedMapDynamic } from '@/modules/map'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Coaching Map | Ride MTB' }

export default function CoachingMapPage() {
  return (
    <div style={{ height: 'calc(100dvh - 64px)' }}>
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <UnifiedMapDynamic
          defaultLayers={['coaching']}
          availableLayers={['trails', 'events', 'coaching']}
          className="h-full"
        />
      </Suspense>
    </div>
  )
}
