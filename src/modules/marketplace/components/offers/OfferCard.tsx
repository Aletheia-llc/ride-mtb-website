import Link from 'next/link'
import Image from 'next/image'
import { Clock, User as UserIcon } from 'lucide-react'
import type { OfferWithDetails, OfferStatus } from '@/modules/marketplace/types'
import { OfferActions } from './OfferActions'

interface OfferCardProps {
  offer: OfferWithDetails
  role: 'buyer' | 'seller'
}

const STATUS_CONFIG: Record<OfferStatus, { label: string; className: string }> =
  {
    pending: {
      label: 'Pending',
      className: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    },
    accepted: {
      label: 'Accepted',
      className:
        'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30',
    },
    declined: {
      label: 'Declined',
      className: 'bg-red-500/15 text-red-500 border-red-500/30',
    },
    countered: {
      label: 'Countered',
      className: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    },
    withdrawn: {
      label: 'Withdrawn',
      className:
        'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)] border-[var(--color-text-muted)]/30',
    },
    expired: {
      label: 'Expired',
      className:
        'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)] border-[var(--color-text-muted)]/30',
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

function timeAgo(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

function expiresIn(date: Date | string): string | null {
  const now = new Date()
  const d = new Date(date)
  const diffMs = d.getTime() - now.getTime()

  if (diffMs <= 0) return 'Expired'
  const diffHours = Math.floor(diffMs / 3600000)
  const diffMins = Math.floor((diffMs % 3600000) / 60000)

  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24)
    return `${days}d ${diffHours % 24}h left`
  }
  if (diffHours > 0) return `${diffHours}h ${diffMins}m left`
  return `${diffMins}m left`
}

export function OfferCard({ offer, role }: OfferCardProps) {
  const statusConfig = STATUS_CONFIG[offer.status as OfferStatus]
  const coverPhoto =
    offer.listing.photos.find((p) => p.isCover) ?? offer.listing.photos[0]
  const listingPrice = parseFloat(String(offer.listing.price))
  const offerAmount = parseFloat(String(offer.amount))
  const percentOfAsking =
    listingPrice > 0 ? Math.round((offerAmount / listingPrice) * 100) : 0

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border-hover,var(--color-border))]">
      <div className="flex gap-4">
        {/* Listing thumbnail */}
        <Link href={`/marketplace/${offer.listing.slug}`} className="shrink-0">
          {coverPhoto ? (
            <Image
              src={coverPhoto.url}
              alt={offer.listing.title}
              width={80}
              height={80}
              className="rounded-lg object-cover"
              style={{ width: 80, height: 80 }}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[var(--color-surface-hover)]">
              <span className="text-xs text-[var(--color-text-muted)]">
                No photo
              </span>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top row: listing title + status */}
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/marketplace/${offer.listing.slug}`}
              className="truncate text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
            >
              {offer.listing.title}
            </Link>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>

          {/* Buyer info (for seller view) */}
          {role === 'seller' && (
            <div className="mt-1 flex items-center gap-1.5">
              {offer.buyer.image ? (
                <Image
                  src={offer.buyer.image}
                  alt={offer.buyer.name ?? 'Buyer'}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              ) : (
                <UserIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
              )}
              <span className="text-xs text-[var(--color-text-muted)]">
                {offer.buyer.name ?? 'Unknown buyer'}
              </span>
            </div>
          )}

          {/* Offer amount */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-[var(--color-primary)]">
              {formatAmount(offer.amount)}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {percentOfAsking}% of {formatAmount(offer.listing.price)}
            </span>
          </div>

          {/* Message */}
          {offer.message && (
            <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">
              &quot;{offer.message}&quot;
            </p>
          )}

          {/* Time + expiry */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
            <span>{timeAgo(offer.createdAt)}</span>
            {offer.status === 'pending' && offer.expiresAt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {expiresIn(offer.expiresAt)}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <OfferActions
            offerId={offer.id}
            role={role}
            status={offer.status}
          />
        </div>
      </div>
    </div>
  )
}
