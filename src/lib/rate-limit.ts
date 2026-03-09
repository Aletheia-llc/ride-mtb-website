import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const limiters = new Map<string, Ratelimit>()

function getLimiter(maxPerMinute: number): Ratelimit {
  const key = `rpm-${maxPerMinute}`
  if (!limiters.has(key)) {
    limiters.set(key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxPerMinute, '1 m'),
      analytics: true,
    }))
  }
  return limiters.get(key)!
}

export async function rateLimit({
  userId,
  action,
  maxPerMinute = 10,
}: {
  userId: string
  action: string
  maxPerMinute?: number
}) {
  const limiter = getLimiter(maxPerMinute)
  const { success } = await limiter.limit(`${userId}:${action}`)

  if (!success) {
    throw new Error('Rate limit exceeded. Please try again in a moment.')
  }
}
