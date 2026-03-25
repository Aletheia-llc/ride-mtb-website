import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { creditSeed: true, creditPurchased: true, creditEarned: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    seed: user.creditSeed,
    purchased: user.creditPurchased,
    earned: user.creditEarned,
    total: user.creditSeed + user.creditPurchased + user.creditEarned,
  })
}
