import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Search } from 'lucide-react'
import type { ConversationWithDetails } from '@/modules/marketplace/types'

/* ---------- helpers ---------- */

function timeAgo(date: Date | string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '\u2026'
}

/* ---------- empty state ---------- */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center">
      <MessageCircle className="mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
      <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
        No messages yet
      </h2>
      <p className="mb-6 max-w-sm text-sm text-[var(--color-text-muted)]">
        When you contact a seller or receive a message, it will appear here.
        Browse listings to find something you like!
      </p>
      <Link
        href="/buy-sell"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
      >
        <Search className="h-4 w-4" />
        Browse Listings
      </Link>
    </div>
  )
}

/* ---------- conversation row ---------- */

function ConversationRow({
  conversation,
}: {
  conversation: ConversationWithDetails
}) {
  const { listing, otherParty, lastMessage, unreadCount } = conversation
  const hasUnread = unreadCount > 0

  const coverPhoto =
    listing.photos.find((p) => p.isCover) ?? listing.photos[0]
  const coverUrl = coverPhoto?.url ?? '/placeholder-bike.jpg'

  const timestamp = lastMessage?.createdAt ?? conversation.createdAt

  return (
    <Link
      href={`/buy-sell/my/messages/${conversation.id}`}
      className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-border-hover,var(--color-border))] hover:bg-[var(--color-surface-hover)]"
    >
      {/* Listing thumbnail */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-bg)]">
        <Image
          src={coverUrl}
          alt={listing.title}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>

      {/* Middle: name + listing title + last message */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={`truncate text-sm ${hasUnread ? 'font-bold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]'}`}
          >
            {otherParty.name ?? 'Unknown'}
          </span>
          <span className="truncate text-xs text-[var(--color-text-muted)]">
            {listing.title}
          </span>
        </div>

        {lastMessage ? (
          <p
            className={`mt-0.5 truncate text-xs ${
              lastMessage.isSystemMessage
                ? 'italic text-[var(--color-text-muted)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            {truncate(lastMessage.body, 50)}
          </p>
        ) : (
          <p className="mt-0.5 truncate text-xs italic text-[var(--color-text-muted)]">
            No messages yet
          </p>
        )}
      </div>

      {/* Right side: time + unread badge */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-[var(--color-text-muted)]">
          {timeAgo(timestamp)}
        </span>
        {hasUnread && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
            {unreadCount}
          </span>
        )}
      </div>
    </Link>
  )
}

/* ---------- main component ---------- */

export function ConversationList({
  conversations,
}: {
  conversations: ConversationWithDetails[]
}) {
  if (conversations.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col gap-2">
      {conversations.map((conversation) => (
        <ConversationRow key={conversation.id} conversation={conversation} />
      ))}
    </div>
  )
}
