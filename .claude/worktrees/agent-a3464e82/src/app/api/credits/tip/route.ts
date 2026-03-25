import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'
import { createNotification } from '@/lib/notifications'
import { db } from '@/lib/db/client'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    await rateLimit({ userId, action: 'credit-tip', maxPerMinute: 10 })
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: { toUserId?: string; amount?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { toUserId, amount } = body

  if (!toUserId || typeof toUserId !== 'string') {
    return NextResponse.json({ error: 'toUserId is required' }, { status: 400 })
  }

  if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 })
  }

  if (toUserId === userId) {
    return NextResponse.json({ error: 'You cannot tip yourself' }, { status: 400 })
  }

  const recipient = await db.user.findUnique({
    where: { id: toUserId },
    select: { id: true, username: true, name: true },
  })

  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  }

  const result = await db.$transaction(async (tx) => {
    // Lock the row so concurrent tips can't both read the same balance
    const [sender] = await tx.$queryRaw<Array<{
      creditSeed: number
      creditPurchased: number
      creditEarned: number
    }>>`SELECT "creditSeed", "creditPurchased", "creditEarned" FROM "users" WHERE id = ${userId} FOR UPDATE`

    if (!sender) throw new Error('Sender not found')

    const totalBalance = sender.creditSeed + sender.creditPurchased + sender.creditEarned
    if (totalBalance < amount) throw new Error('Insufficient balance')

    // Deduct from seed first, then purchased, then earned
    let remaining = amount
    const decrements: { creditSeed?: { decrement: number }; creditPurchased?: { decrement: number }; creditEarned?: { decrement: number } } = {}

    const fromSeed = Math.min(remaining, sender.creditSeed)
    remaining -= fromSeed
    if (fromSeed > 0) decrements.creditSeed = { decrement: fromSeed }

    const fromPurchased = Math.min(remaining, sender.creditPurchased)
    remaining -= fromPurchased
    if (fromPurchased > 0) decrements.creditPurchased = { decrement: fromPurchased }

    const fromEarned = Math.min(remaining, sender.creditEarned)
    if (fromEarned > 0) decrements.creditEarned = { decrement: fromEarned }

    await tx.user.update({ where: { id: userId }, data: decrements })
    await tx.user.update({ where: { id: toUserId }, data: { creditEarned: { increment: amount } } })

    const tip = await tx.creditTip.create({
      data: { fromUserId: userId, toUserId, amount },
    })

    await tx.creditTransaction.createMany({
      data: [
        {
          userId,
          type: 'TIP_SENT',
          amount: -amount,
          description: `Tip sent to ${recipient.username ?? recipient.name ?? 'user'}`,
        },
        {
          userId: toUserId,
          type: 'TIP_RECEIVED',
          amount,
          description: `Tip received`,
        },
      ],
    })

    return tip
  }).catch((err: Error) => {
    if (err.message === 'Insufficient balance') return null
    throw err
  })

  if (!result) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Notify recipient (fire-and-forget)
  void createNotification(
    toUserId,
    'tip_received',
    'You received a tip!',
    `${session.user.name ?? 'Someone'} tipped you ${amount} credits`,
  ).catch(() => {})

  return NextResponse.json(result, { status: 201 })
}
