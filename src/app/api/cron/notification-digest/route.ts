export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // TODO: Implement notification digest
  return Response.json({ status: 'ok', sent: 0, timestamp: new Date().toISOString() })
}
