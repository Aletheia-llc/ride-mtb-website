import 'server-only'

const isConfigured =
  process.env.UPSTASH_REDIS_REST_URL?.startsWith('https://') &&
  process.env.UPSTASH_REDIS_REST_TOKEN?.length

// Module-level singletons — created once per cold start, reused across requests
let redisClient: import('@upstash/redis').Redis | null = null
const limiterCache = new Map<number, import('@upstash/ratelimit').Ratelimit>()

async function getLimiter(maxPerMinute: number): Promise<import('@upstash/ratelimit').Ratelimit> {
  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  let limiter = limiterCache.get(maxPerMinute)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(maxPerMinute, '1 m'),
      analytics: true,
    })
    limiterCache.set(maxPerMinute, limiter)
  }

  return limiter
}

export async function rateLimit({
  userId,
  identifier,
  action,
  maxPerMinute = 10,
}: {
  userId?: string
  identifier?: string
  action: string
  maxPerMinute?: number
}) {
  const id = userId ?? identifier
  if (!id) throw new Error('rateLimit requires userId or identifier')
  if (!isConfigured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[rate-limit] Upstash not configured in production — blocking request')
      throw new Error('Rate limit exceeded. Please try again in a moment.')
    }
    console.warn('[rate-limit] Upstash not configured — rate limiting disabled in dev')
    return
  }

  const limiter = await getLimiter(maxPerMinute)
  const { success } = await limiter.limit(`${id}:${action}`)
  if (!success) {
    throw new Error('Rate limit exceeded. Please try again in a moment.')
  }
}
