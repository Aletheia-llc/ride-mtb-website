import { db } from '@/lib/db/client'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return Response.json({ status: 'error', message: 'Database unreachable' }, { status: 503 })
  }
}
