import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { expireListingsInternal } = await import('@/modules/marketplace/lib/maintenance')
    const result = await expireListingsInternal()
    return NextResponse.json({ ...result, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[cron/marketplace-expire]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
