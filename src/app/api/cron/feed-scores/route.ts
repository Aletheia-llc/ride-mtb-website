import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isConfigured =
    process.env.UPSTASH_REDIS_REST_URL?.startsWith('https://') &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.length

  if (!isConfigured) {
    return NextResponse.json({ skipped: true, reason: 'Redis not configured' })
  }

  const { Redis } = await import('@upstash/redis')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  // Scan all feed:scores:* keys
  let cursor = 0
  let processed = 0
  const DECAY = 0.9

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: 'feed:scores:*', count: 100 })
    cursor = nextCursor as number

    for (const key of keys) {
      const scores = await redis.hgetall<Record<string, number>>(key)
      if (!scores) continue

      const updates: Record<string, number> = {}
      for (const [field, value] of Object.entries(scores)) {
        updates[field] = Math.round(Number(value) * DECAY)
      }

      if (Object.keys(updates).length > 0) {
        await redis.hset(key, updates)
        processed++
      }
    }
  } while (cursor !== 0)

  return NextResponse.json({ processed, timestamp: new Date().toISOString() })
}
