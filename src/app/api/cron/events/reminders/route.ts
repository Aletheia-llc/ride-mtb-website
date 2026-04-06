import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { db } = await import('@/lib/db/client')
    const { createNotification } = await import('@/lib/notifications')

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
        slug: true,
        startDate: true,
        rsvps: {
          where: { status: 'going' },
          select: { userId: true },
        },
      },
    })

    let totalReminders = 0
    for (const event of events) {
      const daysUntil = Math.ceil((event.startDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const timeLabel = daysUntil <= 1 ? 'tomorrow' : `in ${daysUntil} days`

      for (const rsvp of event.rsvps) {
        // Dedup: use event ID + date as unique ref to avoid re-sending
        const dedupKey = `event_reminder_${event.id}_${now.toISOString().slice(0, 10)}`
        const existing = await db.notification.findFirst({
          where: { userId: rsvp.userId, type: 'event_reminder', title: { contains: event.id } },
          select: { id: true },
        })
        if (existing) continue

        await createNotification(
          rsvp.userId,
          'event_reminder',
          `${event.title} is ${timeLabel}`,
          `Don't forget — ${event.title} starts ${timeLabel}!`,
          `/events/${event.slug}`,
        )
        totalReminders++
      }
    }

    return NextResponse.json({ reminded: totalReminders, events: events.length })
  } catch (err) {
    console.error('[cron/events/reminders]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
