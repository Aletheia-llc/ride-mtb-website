import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { db } = await import('@/lib/db/client')

    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const events = await db.event.findMany({
      where: {
        status: 'published',
        startDate: {
          gte: now,
          lte: in3Days,
        },
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            rsvps: {
              where: { status: 'going' },
            },
          },
        },
      },
    })

    let totalReminders = 0
    for (const event of events) {
      const count = event._count.rsvps
      console.log(`[cron/events/reminders] ${event.title}: ${count} reminder(s) queued`)
      totalReminders += count
    }

    return NextResponse.json({ reminded: totalReminders, events: events.length })
  } catch (err) {
    console.error('[cron/events/reminders]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
