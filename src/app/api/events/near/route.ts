import { NextRequest, NextResponse } from 'next/server'
import { getEventsNearLocation } from '@/modules/events/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const latRaw = searchParams.get('lat')
    const lngRaw = searchParams.get('lng')
    if (latRaw === null || lngRaw === null) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
    }
    const lat = Number(latRaw)
    const lng = Number(lngRaw)
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 })
    }
    const radius = Number(searchParams.get('radius')) || 100
    const events = await getEventsNearLocation({ latitude: lat, longitude: lng, radiusKm: radius })
    return NextResponse.json(events)
  } catch (error) {
    console.error('GET /api/events/near error:', error)
    return NextResponse.json({ error: 'Near-me query failed' }, { status: 500 })
  }
}
