import { NextRequest, NextResponse } from 'next/server'
import { getEventsNearLocation } from '@/modules/events/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const radius = Number(searchParams.get('radius') ?? '100')
    if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
    const events = await getEventsNearLocation({ latitude: lat, longitude: lng, radiusKm: radius })
    return NextResponse.json(events)
  } catch (error) {
    console.error('GET /api/events/near error:', error)
    return NextResponse.json({ error: 'Near-me query failed' }, { status: 500 })
  }
}
