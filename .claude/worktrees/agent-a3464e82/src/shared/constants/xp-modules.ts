import type { XpModule } from '@/shared/types/xp'

export const XP_MODULES = {
  FORUM: 'forum',
  LEARN: 'learn',
  TRAILS: 'trails',
  BIKES: 'bikes',
  EVENTS: 'events',
  REVIEWS: 'reviews',
  RIDES: 'rides',
  MARKETPLACE: 'marketplace',
  MERCH: 'merch',
  SHOPS: 'shops',
  MEDIA: 'media',
  COACHING: 'coaching',
} as const satisfies Record<string, XpModule>
