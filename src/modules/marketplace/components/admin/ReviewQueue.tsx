'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, X, Clock, Package } from 'lucide-react'
import type { AdminListingWithDetails } from '@/modules/marketplace/types'
import { approveListings, removeListings } from '@/modules/marketplace/actions/admin'

interface ReviewQueueProps {
  initialListings: AdminListingWithDetails[]
}

export function ReviewQueue({ initialListings }: ReviewQueueProps) {
  const [listings, setListings] = useState(initialListings)
  const [isPending, startTransition] = useTransition()

  function handleApprove(listingId: string) {
    startTransition(async () => {
      await approveListings(listingId)
      setListings((prev) => prev.filter((l) => l.id !== listingId))
    })
  }

  function handleReject(listingId: string) {
    const reason = prompt('Reason for rejection:')
    if (!reason) return
    startTransition(async () => {
      await removeListings(listingId, reason)
      setListings((prev) => prev.filter((l) => l.id !== listingId))
    })
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16">
        <Package className="h-10 w-10 text-[var(--color-text-muted)]" />
        <p className="text-[var(--color-text-muted)]">No listings pending review</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        {listings.length} listing{listings.length !== 1 ? 's' : ''} awaiting review
      </p>

      {listings.map((listing) => (
        <div
          key={listing.id}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border-hover)]"
        >
          <div className="flex gap-4">
            {/* Photo */}
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg)]">
              {listing.photos[0] ? (
                <Image
                  src={listing.photos[0].url}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)] text-xs">
                  No image
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/buy-sell/${listing.slug}`}
                className="block text-base font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
              >
                {listing.title}
              </Link>

              <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                ${parseFloat(String(listing.price)).toFixed(0)}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
                <span>
                  Seller:{' '}
                  <span className="text-[var(--color-text)]">
                    {listing.seller.name ?? listing.seller.email ?? 'Unknown'}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(listing.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                {listing.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-col gap-2">
              <button
                onClick={() => handleApprove(listing.id)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => handleReject(listing.id)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
