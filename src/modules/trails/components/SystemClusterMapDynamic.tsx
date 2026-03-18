'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { SystemClusterMap } from './SystemClusterMap'

const SystemClusterMapClient = dynamic(
  () => import('./SystemClusterMap').then((m) => m.SystemClusterMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-[var(--color-bg-secondary)]" /> }
)

export function SystemClusterMapDynamic(props: ComponentProps<typeof SystemClusterMap>) {
  return <SystemClusterMapClient {...props} />
}
