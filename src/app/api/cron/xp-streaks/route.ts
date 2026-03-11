import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Dynamic import to avoid loading DB client during build
  const { resetExpiredStreaks } = await import('@/modules/xp/lib/engine')
  const count = await resetExpiredStreaks()

  return NextResponse.json({ reset: count, timestamp: new Date().toISOString() })
}
