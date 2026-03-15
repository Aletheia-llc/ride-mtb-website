// src/app/api/fantasy/prices/[eventId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { db } from '@/lib/db/client'
import type { PriceSnapshot } from '@/modules/fantasy/worker/pricesRecalculate'
import { auth } from '@/lib/auth/config'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await params

  const redisKey = `fantasy:prices:${eventId}`

  // Attempt Redis read
  let prices: PriceSnapshot | null = null
  try {
    const raw = await redis.get<PriceSnapshot>(redisKey)
    if (raw) {
      prices = raw
    }
  } catch (err) {
    console.warn(`[fantasy/prices] Redis read failed for ${eventId}:`, err)
  }

  // Postgres fallback
  if (!prices) {
    const entries = await db.riderEventEntry.findMany({
      where: { eventId },
      select: { riderId: true, marketPriceCents: true },
    })
    prices = {}
    for (const entry of entries) {
      prices[entry.riderId] = { cents: entry.marketPriceCents, prev: null }
    }
  }

  return NextResponse.json(
    { prices, ts: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
