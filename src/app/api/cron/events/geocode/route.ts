import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { db } = await import('@/lib/db/client')

    const events = await db.event.findMany({
      where: { latitude: null, location: { not: null }, status: 'published' },
      select: { id: true, location: true },
      take: 20,
    })

    const token = process.env.MAPBOX_ACCESS_TOKEN
    let geocoded = 0
    let skipped = 0

    for (const event of events) {
      if (!event.location) {
        skipped++
        continue
      }

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(event.location)}.json?access_token=${token}&limit=1`
        const res = await fetch(url)
        const data = await res.json()
        const center = data.features?.[0]?.center

        if (center) {
          const [longitude, latitude] = center
          await db.event.update({
            where: { id: event.id },
            data: { latitude, longitude },
          })
          geocoded++
        } else {
          skipped++
        }
      } catch (err) {
        console.error(`[cron/events/geocode] failed for event ${event.id}:`, err)
        skipped++
      }

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return NextResponse.json({ geocoded, skipped, total: events.length })
  } catch (err) {
    console.error('[cron/events/geocode]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
