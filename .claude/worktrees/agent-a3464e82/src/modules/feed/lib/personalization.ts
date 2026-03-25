import 'server-only'
import type { FeedItem } from '../types'

interface UserProfile {
  interests: string[]
  skillLevel: string | null
  ridingStyle: string | null
  location: string | null
}

export interface ScoredFeedItem extends FeedItem {
  score: number
  reason?: string
}

// Maps interest tag labels to category keys used in FeedItem.category
const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  Trail: ['trail'],
  Enduro: ['trail', 'forum:enduro'],
  Downhill: ['trail', 'forum:downhill-freeride'],
  XC: ['trail', 'forum:xc-marathon'],
  'Bike Tech': ['forum:bike-tech', 'buysell'],
  'Skills Coaching': ['riding_skills', 'learn'],
  'Events & Racing': ['events'],
  'Gear Reviews': ['reviews'],
  'Buy & Sell': ['buysell'],
}

const RIDING_STYLE_BOOSTS: Record<string, string[]> = {
  'Downhill / Freeride': ['trail', 'forum:downhill-freeride'],
  Enduro: ['trail', 'forum:enduro'],
  'Cross Country': ['trail', 'forum:xc-marathon'],
  Trail: ['trail'],
}

function getInterestBoost(category: string, interests: string[]): number {
  for (const interest of interests) {
    const categories = INTEREST_CATEGORY_MAP[interest] ?? []
    if (categories.some((c) => category.startsWith(c))) return 5
  }
  return 0
}

function getProfileBoost(item: FeedItem, profile: UserProfile): number {
  let boost = 0

  if (profile.ridingStyle) {
    const styleCategories = RIDING_STYLE_BOOSTS[profile.ridingStyle] ?? []
    if (styleCategories.some((c) => item.category.startsWith(c))) boost += 3
  }

  return boost
}

function getAgePenalty(createdAt: Date): number {
  const daysOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysOld <= 14) return 0
  return Math.round(daysOld - 14) * 2
}

function getBehaviorBoost(category: string, behaviorScores: Record<string, number>): number {
  // Direct category match (e.g. "trail", "events", "reviews", "buysell")
  if (behaviorScores[category] != null) return behaviorScores[category]
  // Forum subcategory match (e.g. "forum:bike-tech" → look for "forum:bike-tech")
  if (category.startsWith('forum:')) {
    const slug = category.replace('forum:', '')
    return behaviorScores[`forum:${slug}`] ?? 0
  }
  // Learn category (e.g. "riding_skills" → "learn:riding_skills")
  return behaviorScores[`learn:${category}`] ?? 0
}

function getReasonLabel(item: FeedItem, profile: UserProfile): string {
  if (profile.interests.length > 0) {
    for (const interest of profile.interests) {
      const categories = INTEREST_CATEGORY_MAP[interest] ?? []
      if (categories.some((c) => item.category.startsWith(c))) {
        return `✦ Based on ${interest} interest`
      }
    }
  }
  if (item.type === 'event' && profile.location) {
    return `✦ Near your saved trails`
  }
  if (item.type === 'trail') {
    return `✦ Matches your ride style`
  }
  return `✦ Popular right now`
}

export function scoreFeedItems(
  items: FeedItem[],
  profile: UserProfile,
  behaviorScores: Record<string, number>,
): ScoredFeedItem[] {
  const scored = items.map((item) => {
    const interestBoost = getInterestBoost(item.category, profile.interests)
    const profileBoost = getProfileBoost(item, profile)
    const behaviorBoost = getBehaviorBoost(item.category, behaviorScores)
    const agePenalty = getAgePenalty(item.createdAt)

    const score = item.engagementScore + interestBoost + profileBoost + behaviorBoost - agePenalty

    return {
      ...item,
      score,
      reason: getReasonLabel(item, profile),
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}

function isRedisConfigured(): boolean {
  return (
    typeof process.env.UPSTASH_REDIS_REST_URL === 'string' &&
    process.env.UPSTASH_REDIS_REST_URL.startsWith('https://') &&
    typeof process.env.UPSTASH_REDIS_REST_TOKEN === 'string' &&
    process.env.UPSTASH_REDIS_REST_TOKEN.length > 0
  )
}

export async function getBehaviorScores(userId: string): Promise<Record<string, number>> {
  if (!isRedisConfigured()) return {}

  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })

    const raw = await redis.hgetall<Record<string, number>>(`feed:scores:${userId}`)
    return raw ?? {}
  } catch {
    return {}
  }
}

export async function recordFeedClick(userId: string, categoryKey: string, increment: number): Promise<void> {
  if (!isRedisConfigured()) return

  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    await redis.hincrby(`feed:scores:${userId}`, categoryKey, increment)
  } catch {
    // Silently ignore Redis errors — feed still works unranked
  }
}
