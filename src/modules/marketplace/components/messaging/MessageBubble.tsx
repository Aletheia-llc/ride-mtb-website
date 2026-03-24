import Image from 'next/image'
import type { MessageWithSender } from '@/modules/marketplace/types'

/* ---------- helpers ---------- */

function formatTimestamp(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (isToday) return time

  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${dateStr}, ${time}`
}

function getInitial(name: string | null): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

/* ---------- component ---------- */

export function MessageBubble({
  message,
  isCurrentUser,
}: {
  message: MessageWithSender
  isCurrentUser: boolean
}) {
  // System message: centered, muted, smaller
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center px-4 py-2">
        <p className="text-xs text-[var(--color-text-muted)] italic">
          &mdash; {message.body} &mdash;
        </p>
      </div>
    )
  }

  // Current user: right-aligned, primary tint
  if (isCurrentUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-2.5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
              {message.body}
            </p>
          </div>
          <p className="mt-1 text-right text-[11px] text-[var(--color-text-muted)]">
            {formatTimestamp(message.createdAt)}
          </p>
        </div>
      </div>
    )
  }

  // Other party: left-aligned, avatar + name
  const { sender } = message

  return (
    <div className="flex gap-2.5 px-4 py-1">
      {/* Avatar */}
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface)]">
        {sender.image ? (
          <Image
            src={sender.image}
            alt={sender.name ?? 'User'}
            width={32}
            height={32}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">
            {getInitial(sender.name)}
          </span>
        )}
      </div>

      {/* Bubble */}
      <div className="max-w-[75%]">
        <p className="mb-0.5 text-xs font-medium text-[var(--color-text-muted)]">
          {sender.name ?? 'Unknown'}
        </p>
        <div className="rounded-2xl rounded-bl-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
            {message.body}
          </p>
        </div>
        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
          {formatTimestamp(message.createdAt)}
        </p>
      </div>
    </div>
  )
}
