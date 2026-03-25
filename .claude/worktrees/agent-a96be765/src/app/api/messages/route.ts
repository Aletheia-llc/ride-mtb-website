import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db/client'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })

  if (!participant) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  const messages = await db.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 50,
    include: {
      sender: {
        select: { id: true, name: true, username: true, avatarUrl: true, image: true },
      },
    },
  })

  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      sender: { ...m.sender, avatarUrl: m.sender.avatarUrl ?? m.sender.image },
    })),
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    await rateLimit({ userId, action: 'dm-send', maxPerMinute: 30 })
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: { conversationId: string; body: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversationId, body: messageBody } = body

  if (!conversationId || !messageBody?.trim()) {
    return NextResponse.json(
      { error: 'conversationId and body are required' },
      { status: 400 },
    )
  }

  if (messageBody.length > 5000) {
    return NextResponse.json({ error: 'message_too_long' }, { status: 400 })
  }

  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })

  if (!participant) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  const [message] = await db.$transaction([
    db.directMessage.create({
      data: { conversationId, senderId: userId, body: messageBody.trim() },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true, image: true },
        },
      },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ])

  return NextResponse.json({
    ...message,
    sender: { ...message.sender, avatarUrl: message.sender.avatarUrl ?? message.sender.image },
  })
}
