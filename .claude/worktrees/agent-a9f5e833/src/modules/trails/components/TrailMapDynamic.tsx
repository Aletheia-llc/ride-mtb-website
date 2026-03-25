'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/ui/components'

export const TrailMapDynamic = dynamic(
  () =>
    import('@/modules/trails/components/TrailMap').then((m) => ({
      default: m.TrailMap,
    })),
  {
    ssr: false,
    loading: () => <Skeleton variant="map" />,
  },
)
