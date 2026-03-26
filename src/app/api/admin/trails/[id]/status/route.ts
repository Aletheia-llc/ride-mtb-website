import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { pool } from '@/lib/db/client'

const VALID_STATUSES = ['open', 'pending', 'closed_seasonal', 'closed_conditions',
                        'closed_construction', 'closed_permanent', 'unknown']

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE trail_systems SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
      [status, id],
    )
    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Trail system not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Trail status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
