import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })
    const token = process.env.MAPBOX_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: 'Geocoding not configured' }, { status: 503 })
    const encoded = encodeURIComponent(address)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1`
    const res = await fetch(url)
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return NextResponse.json({ latitude: null, longitude: null })
    const [longitude, latitude] = feature.center
    return NextResponse.json({ latitude, longitude, placeName: feature.place_name })
  } catch (error) {
    console.error('POST /api/geocode error:', error)
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}
