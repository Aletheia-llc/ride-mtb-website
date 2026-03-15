import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))
    const skip = (page - 1) * pageSize

    const [transactions, total] = await Promise.all([
      db.creditTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.creditTransaction.count({ where: { userId: session.user.id } }),
    ])

    return NextResponse.json({ transactions, total, page, pageSize })
  } catch (err) {
    console.error('[api/credits/transactions]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
