import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { db } = await import('@/lib/db/client')

    const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const result = await db.fantasyEvent.updateMany({
      where: {
        status: 'upcoming',
        raceDate: { gte: new Date(), lte: twoWeeksFromNow },
      },
      data: { status: 'roster_open' },
    })

    return NextResponse.json({ opened: result.count, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Fantasy open-rosters cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
