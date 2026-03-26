import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ unreadCount: 0 })
  }

  try {
    const unreadCount = await db.forumNotification.count({
      where: { userId: session.user.id, read: false },
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Notifications count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
