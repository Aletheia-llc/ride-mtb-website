import { NextRequest, NextResponse } from 'next/server'
import { searchEvents } from '@/modules/events/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const result = await searchEvents({
      query: searchParams.get('q') ?? undefined,
      eventType: searchParams.get('type') ?? undefined,
      isFree: searchParams.get('free') === 'true' ? true : undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ? (Number(searchParams.get('limit')) || 20) : 20,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/events/search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
