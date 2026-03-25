import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'
import { createNotification } from '@/lib/notifications'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const TIP_AMOUNT = 10

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    await rateLimit({ userId, action: 'forum-tip', maxPerMinute: 10 })
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { id: postId } = await params

  // Support tipping comments too via optional ?commentId= query param
  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('commentId') ?? undefined

  // Look up the target post (and optionally comment) to get the recipient
  const post = await db.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, author: { select: { username: true, name: true } } },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  let toUserId = post.authorId

  if (commentId) {
    const comment = await db.comment.findUnique({
      where: { id: commentId, postId, deletedAt: null },
      select: { id: true, authorId: true },
    })
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }
    toUserId = comment.authorId
  }

  if (toUserId === userId) {
    return NextResponse.json({ error: 'You cannot tip your own content' }, { status: 400 })
  }

  // Anti-spam: prevent tipping the same post/comment within 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentTip = await db.creditTip.findFirst({
    where: {
      fromUserId: userId,
      ...(commentId ? { commentId } : { postId, commentId: null }),
      createdAt: { gte: oneDayAgo },
    },
  })

  if (recentTip) {
    return NextResponse.json(
      { error: 'You already tipped this content recently. Try again in 24 hours.' },
      { status: 400 },
    )
  }

  const recipient = await db.user.findUnique({
    where: { id: toUserId },
    select: { id: true, username: true, name: true },
  })

  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  }

  const result = await db.$transaction(async (tx) => {
    // Row-level lock to prevent concurrent race conditions
    const [sender] = await tx.$queryRaw<Array<{
      creditSeed: number
      creditPurchased: number
      creditEarned: number
    }>>`SELECT "creditSeed", "creditPurchased", "creditEarned" FROM "users" WHERE id = ${userId} FOR UPDATE`

    if (!sender) throw new Error('Sender not found')

    const totalBalance = sender.creditSeed + sender.creditPurchased + sender.creditEarned
    if (totalBalance < TIP_AMOUNT) throw new Error('Insufficient balance')

    // Deduct from seed first, then purchased, then earned
    let remaining = TIP_AMOUNT
    const decrements: {
      creditSeed?: { decrement: number }
      creditPurchased?: { decrement: number }
      creditEarned?: { decrement: number }
    } = {}

    const fromSeed = Math.min(remaining, sender.creditSeed)
    remaining -= fromSeed
    if (fromSeed > 0) decrements.creditSeed = { decrement: fromSeed }

    const fromPurchased = Math.min(remaining, sender.creditPurchased)
    remaining -= fromPurchased
    if (fromPurchased > 0) decrements.creditPurchased = { decrement: fromPurchased }

    const fromEarned = Math.min(remaining, sender.creditEarned)
    if (fromEarned > 0) decrements.creditEarned = { decrement: fromEarned }

    await tx.user.update({ where: { id: userId }, data: decrements })
    await tx.user.update({ where: { id: toUserId }, data: { creditEarned: { increment: TIP_AMOUNT } } })

    const tip = await tx.creditTip.create({
      data: {
        fromUserId: userId,
        toUserId,
        amount: TIP_AMOUNT,
        postId: postId,
        ...(commentId ? { commentId } : {}),
      },
    })

    await tx.creditTransaction.createMany({
      data: [
        {
          userId,
          type: 'TIP_SENT',
          amount: -TIP_AMOUNT,
          description: `Tip sent to ${recipient.username ?? recipient.name ?? 'user'}`,
        },
        {
          userId: toUserId,
          type: 'TIP_RECEIVED',
          amount: TIP_AMOUNT,
          description: `Tip received for forum ${commentId ? 'comment' : 'post'}`,
        },
      ],
    })

    // Count total tips on this post/comment for the response
    const tipCount = await tx.creditTip.count({
      where: commentId ? { commentId } : { postId, commentId: null },
    })

    return { tip, tipCount }
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
    `${session.user.name ?? 'Someone'} tipped you ${TIP_AMOUNT} credits on your forum ${commentId ? 'comment' : 'post'}`,
  ).catch(() => {})

  return NextResponse.json({ tipCount: result.tipCount }, { status: 201 })
}

// GET: fetch tip count + whether the current user has already tipped
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: postId } = await params
  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('commentId') ?? undefined

  const session = await auth()
  const userId = session?.user?.id

  const [tipCount, userTip] = await Promise.all([
    db.creditTip.count({
      where: commentId ? { commentId } : { postId, commentId: null },
    }),
    userId
      ? db.creditTip.findFirst({
          where: {
            fromUserId: userId,
            ...(commentId ? { commentId } : { postId, commentId: null }),
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json({ tipCount, hasTipped: !!userTip })
}
