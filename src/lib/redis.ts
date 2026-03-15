// src/lib/redis.ts
import 'server-only'
import { Redis } from '@upstash/redis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis: Redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
  })

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}
