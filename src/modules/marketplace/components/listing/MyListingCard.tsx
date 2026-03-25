'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Pencil, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { markAsSold, cancelListing } from '@/modules/marketplace/actions/listing-mutations'
import { ConditionBadge } from './ConditionBadge'
import type { ListingWithPhotos, ListingStatus } from '@/modules/marketplace/types'

/* ---------- helpers ---------- */

function formatPrice(price: number | string | { toString(): string }): string {
  const num = typeof price === 'number' ? price : parseFloat(String(price))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ---------- status badge config ---------- */

const STATUS_CONFIG: Record<ListingStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  pending_review: {
    label: 'Pending Review',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  },
  sold: {
    label: 'Sold',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[var(--color-border)] text-[var(--color-dim)]',
  },
  expired: {
    label: 'Expired',
    className: 'bg-[var(--color-border)] text-[var(--color-dim)]',
  },
  draft: {
    label: 'Draft',
    className: 'bg-[var(--color-border)] text-[var(--color-dim)]',
  },
  reserved: {
    label: 'Reserved',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  },
  removed: {
    label: 'Removed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
}

/* ---------- component ---------- */

interface MyListingCardProps {
  listing: ListingWithPhotos
}

export function MyListingCard({ listing }: MyListingCardProps) {
  const [isSoldPending, startSoldTransition] = useTransition()
  const [isCancelPending, startCancelTransition] = useTransition()
  const isPending = isSoldPending || isCancelPending

  const coverPhoto = listing.photos.find((p) => p.isCover) ?? listing.photos[0]
  const coverUrl = coverPhoto?.url ?? '/placeholder-bike.jpg'
  const location = [listing.city, listing.state].filter(Boolean).join(', ')

  const status = listing.status as ListingStatus
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft

  function handleMarkSold() {
    if (!confirm('Mark this listing as sold? This cannot be undone.')) return
    startSoldTransition(async () => {
      await markAsSold(listing.id)
    })
  }

  function handleCancel() {
    if (!confirm('Cancel this listing? It will be removed from the marketplace.')) return
    startCancelTransition(async () => {
      await cancelListing(listing.id)
    })
  }

  const showMarkSold = status === 'active'
  const showCancel =
    status === 'active' || status === 'pending_review' || status === 'draft'
  const editHref = `/buy-sell/sell/${listing.id}/edit`

  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-bg-secondary)]">
      {/* Cover thumbnail */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg)]">
        <Image
          src={coverUrl}
          alt={listing.title}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      {/* Center info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/buy-sell/${listing.slug}`}
            className="truncate text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            {listing.title}
          </Link>
          <span
            className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <ConditionBadge condition={listing.condition} />
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {formatPrice(listing.price)}
          </span>
          {location && (
            <span className="text-xs text-[var(--color-text-muted)]">{location}</span>
          )}
          <span className="text-xs text-[var(--color-dim)]">
            Listed {formatDate(listing.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={editHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>

        {showMarkSold && (
          <button
            type="button"
            onClick={handleMarkSold}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800 transition-colors hover:bg-green-200 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            {isSoldPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            Mark Sold
          </button>
        )}

        {showCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            {isCancelPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
