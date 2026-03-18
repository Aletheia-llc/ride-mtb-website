import { NextResponse } from 'next/server'
import { getCoachingMapData } from '@/modules/coaching/lib/queries'

export async function GET() {
  try {
    const data = await getCoachingMapData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/coaching/map error:', error)
    return NextResponse.json({ error: 'Failed to load coaching map data' }, { status: 500 })
  }
}
