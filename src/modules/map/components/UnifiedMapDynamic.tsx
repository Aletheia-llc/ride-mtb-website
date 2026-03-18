'use client'

import dynamic from 'next/dynamic'

export const UnifiedMapDynamic = dynamic(
  () => import('./UnifiedMap').then((m) => m.UnifiedMap),
  { ssr: false }
)
