import 'server-only'

export const flags = {
  coaching: process.env.FEATURE_COACHING === 'true',
  marketplace: process.env.FEATURE_MARKETPLACE === 'true',
  merch: process.env.FEATURE_MERCH === 'true',
} as const

export type FeatureFlag = keyof typeof flags
