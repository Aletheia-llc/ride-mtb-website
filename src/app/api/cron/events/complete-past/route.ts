import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { db } = await import('@/lib/db/client')

    const result = await db.event.updateMany({
      where: {
        status: 'published',
        startDate: { lt: new Date() },
      },
      data: { status: 'completed' },
    })

    return NextResponse.json({ updated: result.count })
  } catch (err) {
    console.error('[cron/events/complete-past]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
