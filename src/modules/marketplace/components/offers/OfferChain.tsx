import Image from 'next/image'
import { User as UserIcon } from 'lucide-react'
import type { OfferChainItem, OfferStatus } from '@/modules/marketplace/types'

interface OfferChainProps {
  items: OfferChainItem[]
  currentUserId: string
}

const STATUS_CONFIG: Record<OfferStatus, { label: string; className: string }> =
  {
    pending: {
      label: 'Pending',
      className: 'bg-amber-500/15 text-amber-500',
    },
    accepted: {
      label: 'Accepted',
      className:
        'bg-[var(--color-primary)]/15 text-[var(--color-primary)]',
    },
    declined: {
      label: 'Declined',
      className: 'bg-red-500/15 text-red-500',
    },
    countered: {
      label: 'Countered',
      className: 'bg-blue-500/15 text-blue-500',
    },
    withdrawn: {
      label: 'Withdrawn',
      className:
        'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]',
    },
    expired: {
      label: 'Expired',
      className:
        'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]',
    },
  }

function formatAmount(
  amount: number | string | { toString(): string },
): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatTimestamp(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function OfferChain({ items, currentUserId }: OfferChainProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No offer history found.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isCurrentUser = item.sender.id === currentUserId
        const statusConfig = STATUS_CONFIG[item.status as OfferStatus]

        return (
          <div
            key={item.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[85%] gap-2.5 ${
                isCurrentUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div className="shrink-0 pt-0.5">
                {item.sender.image ? (
                  <Image
                    src={item.sender.image}
                    alt={item.sender.name ?? 'User'}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-hover)]">
                    <UserIcon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div
                className={`rounded-xl border border-[var(--color-border)] p-3 ${
                  isCurrentUser
                    ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20'
                    : 'bg-[var(--color-surface)]'
                }`}
              >
                {/* Name + status */}
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    {item.sender.name ?? 'Unknown'}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Amount */}
                <p className="text-base font-bold text-[var(--color-primary)]">
                  {formatAmount(item.amount)}
                </p>

                {/* Message */}
                {item.message && (
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {item.message}
                  </p>
                )}

                {/* Timestamp */}
                <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
                  {formatTimestamp(item.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
