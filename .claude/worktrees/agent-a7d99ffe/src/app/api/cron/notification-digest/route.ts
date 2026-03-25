import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Implement weekly notification digest email
  // For now, just acknowledge the cron ran
  return NextResponse.json({
    status: 'ok',
    message: 'Notification digest not yet implemented',
    timestamp: new Date().toISOString()
  })
}
