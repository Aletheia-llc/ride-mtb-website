import dynamic from 'next/dynamic'

export const UnifiedMapDynamic = dynamic(
  () => import('./components/UnifiedMap').then((m) => m.UnifiedMap),
  { ssr: false }
)

export type { LayerName } from './types'
