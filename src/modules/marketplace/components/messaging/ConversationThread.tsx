'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { ConversationFull } from '@/modules/marketplace/types'
import { markConversationRead } from '@/modules/marketplace/actions/messages'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

export function ConversationThread({
  conversation,
  currentUserId,
}: {
  conversation: ConversationFull
  currentUserId: string
}) {
  const { listing, messages, otherParty } = conversation

  const coverPhoto =
    listing.photos.find((p) => p.isCover) ?? listing.photos[0]
  const coverUrl = coverPhoto?.url ?? '/placeholder-bike.jpg'

  // Mark conversation as read on mount
  useEffect(() => {
    markConversationRead(conversation.id).catch(() => {
      // Non-critical — silently ignore read-marking failures
    })
  }, [conversation.id])

  return (
    <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-4xl flex-col sm:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        {/* Back arrow */}
        <Link
          href="/buy-sell/my/messages"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Listing thumbnail */}
        <Link
          href={`/buy-sell/${listing.slug}`}
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface)]"
        >
          <Image
            src={coverUrl}
            alt={listing.title}
            fill
            sizes="40px"
            className="object-cover"
          />
        </Link>

        {/* Listing title + other party name */}
        <div className="min-w-0 flex-1">
          <Link
            href={`/buy-sell/${listing.slug}`}
            className="block truncate text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            {listing.title}
          </Link>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            {otherParty.name ?? 'Unknown'}
          </p>
        </div>

        {/* View Listing link */}
        <Link
          href={`/buy-sell/${listing.slug}`}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-hover,var(--color-border))] hover:text-[var(--color-text)]"
        >
          View Listing
          <ExternalLink className="h-3 w-3" />
        </Link>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <p className="py-20 text-center text-sm text-[var(--color-text-muted)]">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isCurrentUser={msg.senderId === currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput conversationId={conversation.id} />
    </div>
  )
}
