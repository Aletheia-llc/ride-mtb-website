import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 })
    }

    const count = await db.notification.count({
      where: { userId: session.user.id, read: false },
    })

    return NextResponse.json({ count })
  } catch (err) {
    console.error('[api/notifications/unread-count]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
