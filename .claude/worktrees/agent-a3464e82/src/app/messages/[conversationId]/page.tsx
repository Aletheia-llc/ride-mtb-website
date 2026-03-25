import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, User } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { MessageThread } from '../MessageThread'

export const metadata: Metadata = {
  title: 'Conversation | Ride MTB',
}

interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ConversationPage({ params }: PageProps) {
  const user = await requireAuth()
  const userId = user.id
  const { conversationId } = await params

  // Verify user is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })

  if (!participant) notFound()

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              image: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              image: true,
            },
          },
        },
      },
    },
  })

  if (!conversation) notFound()

  // Mark as read
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  })

  const otherParticipant = conversation.participants.find((p) => p.userId !== userId)
  const otherUser = otherParticipant?.user

  const messagesData = conversation.messages.map((msg) => ({
    id: msg.id,
    body: msg.body,
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt),
    senderId: msg.senderId,
    sender: {
      id: msg.sender.id,
      name: msg.sender.name,
      username: msg.sender.username,
      avatarUrl: msg.sender.avatarUrl ?? msg.sender.image,
    },
  }))

  const otherUserAvatarUrl = otherUser?.avatarUrl ?? otherUser?.image

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
        <Link
          href="/messages"
          className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {otherUserAvatarUrl ? (
          <Image
            src={otherUserAvatarUrl}
            alt={otherUser?.name ?? ''}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
            <User className="h-4 w-4 text-[var(--color-text-muted)]" />
          </div>
        )}

        <div>
          <div className="text-sm font-medium text-[var(--color-text)]">
            {otherUser?.name ?? otherUser?.username ?? 'Unknown User'}
          </div>
          {otherUser?.username && (
            <Link
              href={`/forum/user/${otherUser.username}`}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
            >
              @{otherUser.username}
            </Link>
          )}
        </div>
      </div>

      <MessageThread
        conversationId={conversationId}
        currentUserId={userId}
        initialMessages={messagesData}
      />
    </div>
  )
}
