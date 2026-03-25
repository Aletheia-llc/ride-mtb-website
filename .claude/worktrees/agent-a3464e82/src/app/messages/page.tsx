import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { MessageSquare, User } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { NewMessageButton } from './NewMessageButton'

export const metadata: Metadata = {
  title: 'Messages | Ride MTB',
}

interface PageProps {
  searchParams: Promise<{ to?: string }>
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const user = await requireAuth()
  const userId = user.id
  const params = await searchParams

  // Handle ?to=[userId] — auto-start a conversation
  if (params.to && params.to !== userId) {
    const recipient = await db.user.findUnique({
      where: { id: params.to },
      select: { id: true },
    })

    if (recipient) {
      const existing = await db.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: params.to } } },
          ],
        },
      })

      if (existing) {
        redirect(`/messages/${existing.id}`)
      }

      const conversation = await db.conversation.create({
        data: {
          participants: {
            create: [
              { userId, lastReadAt: new Date() },
              { userId: params.to },
            ],
          },
        },
      })

      redirect(`/messages/${conversation.id}`)
    }
  }

  const conversations = await db.conversation.findMany({
    where: { participants: { some: { userId } } },
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
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, body: true, senderId: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const conversationData = conversations.map((conv) => {
    const myParticipant = conv.participants.find((p) => p.userId === userId)
    const otherParticipant = conv.participants.find((p) => p.userId !== userId)
    const lastMessage = conv.messages[0] ?? null
    const hasUnread =
      !!lastMessage &&
      (!myParticipant?.lastReadAt ||
        new Date(lastMessage.createdAt) > new Date(myParticipant.lastReadAt))

    const ou = otherParticipant?.user
    return {
      id: conv.id,
      updatedAt: conv.updatedAt.toISOString(),
      otherUser: ou
        ? {
            id: ou.id,
            name: ou.name,
            username: ou.username,
            avatarUrl: ou.avatarUrl ?? ou.image,
          }
        : null,
      lastMessage: lastMessage
        ? {
            body: lastMessage.body,
            senderId: lastMessage.senderId,
            createdAt:
              lastMessage.createdAt instanceof Date
                ? lastMessage.createdAt.toISOString()
                : String(lastMessage.createdAt),
          }
        : null,
      hasUnread,
    }
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">
          <MessageSquare className="h-5 w-5" />
          Messages
        </h1>
        <NewMessageButton />
      </div>

      {conversationData.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-16 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-muted)]">No conversations yet.</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Start one by messaging a user on their profile.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversationData.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-[var(--color-bg-secondary)] ${
                conv.hasUnread
                  ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)]'
              }`}
            >
              {conv.otherUser?.avatarUrl ? (
                <Image
                  src={conv.otherUser.avatarUrl}
                  alt={conv.otherUser.name ?? ''}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                  <User className="h-5 w-5 text-[var(--color-text-muted)]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${conv.hasUnread ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                    {conv.otherUser?.name ?? conv.otherUser?.username ?? 'Unknown'}
                  </span>
                  {conv.lastMessage && (
                    <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                      {new Date(conv.lastMessage.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    {conv.lastMessage.body}
                  </p>
                )}
              </div>
              {conv.hasUnread && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
