import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { pool } from '@/lib/db/client'

const VALID_STATUSES = ['open', 'pending', 'closed_seasonal', 'closed_conditions',
                        'closed_construction', 'closed_permanent', 'unknown']

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await pool.query(
    `UPDATE trail_systems SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
    [status, id],
  )

  return NextResponse.json({ ok: true })
}
