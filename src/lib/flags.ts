import 'server-only'
import { env } from '@/lib/env'

export const flags = {
  coaching: env.FEATURE_COACHING === 'true',
  marketplace: env.FEATURE_MARKETPLACE === 'true',
  merch: env.FEATURE_MERCH === 'true',
} as const

export type FeatureFlag = keyof typeof flags
