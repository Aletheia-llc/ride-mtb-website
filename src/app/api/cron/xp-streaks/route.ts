import { resetExpiredStreaks } from '@/modules/xp'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const resetCount = await resetExpiredStreaks()

  return Response.json({
    status: 'ok',
    streaksReset: resetCount,
    timestamp: new Date().toISOString(),
  })
}
