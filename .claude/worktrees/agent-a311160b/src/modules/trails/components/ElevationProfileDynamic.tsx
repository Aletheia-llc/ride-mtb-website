'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/ui/components'

export const ElevationProfileDynamic = dynamic(
  () =>
    import('@/modules/trails/components/ElevationProfile').then((m) => ({
      default: m.ElevationProfile,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full" />,
  },
)
