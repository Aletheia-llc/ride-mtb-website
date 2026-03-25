import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 })
  }

  const count = await db.notification.count({
    where: { userId: session.user.id, read: false },
  })

  return NextResponse.json({ count })
}
