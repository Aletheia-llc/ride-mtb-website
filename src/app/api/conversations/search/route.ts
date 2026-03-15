import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q) return NextResponse.json([])

    const users = await db.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } },
          { bannedAt: null },
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, name: true, username: true, avatarUrl: true, image: true },
      take: 10,
    })

    return NextResponse.json(
      users.map((u) => ({ ...u, avatarUrl: u.avatarUrl ?? u.image })),
    )
  } catch (err) {
    console.error('[api/conversations/search]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
