'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, Trash2, CheckCircle, Tag } from 'lucide-react'
import { statusLabels } from '../types'
import type { ListingStatus } from '../types'

interface DashboardListing {
  id: string
  title: string
  slug: string
  price: number
  category: string
  condition: string
  status: ListingStatus
  imageUrls: unknown
  location: string | null
  createdAt: Date
  _count: { favorites: number }
}

interface SellerDashboardProps {
  listings: DashboardListing[]
}

const statusColors: Record<ListingStatus, string> = {
  draft: 'text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]',
  active: 'text-green-600 bg-green-500/10',
  sold: 'text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]',
  reserved: 'text-yellow-600 bg-yellow-500/10',
  expired: 'text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]',
  removed: 'text-red-600 bg-red-500/10',
}

export function SellerDashboard({ listings }: SellerDashboardProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  const updateStatus = async (listingId: string, status: ListingStatus) => {
    setPending(listingId)
    try {
      const res = await fetch('/api/marketplace/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[SellerDashboard] updateStatus failed:', data.error)
        return
      }
      router.refresh()
    } finally {
      setPending(null)
    }
  }

  const handleDelete = async (listingId: string) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setPending(listingId)
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[SellerDashboard] delete failed:', data.error)
        return
      }
      router.refresh()
    } finally {
      setPending(null)
    }
  }

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center text-[var(--color-text-muted)]">
        <Tag className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <p className="text-lg font-medium">No listings yet</p>
        <Link
          href="/marketplace/create"
          className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white"
        >
          Create Your First Listing
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const images = Array.isArray(listing.imageUrls) ? (listing.imageUrls as string[]) : []
        const cover = images[0] ?? null
        const isLoading = pending === listing.id

        return (
          <div
            key={listing.id}
            className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
          >
            {/* Thumbnail */}
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg-secondary)]">
              {cover ? (
                <Image src={cover} alt={listing.title} fill className="object-cover" sizes="80px" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                  No img
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/marketplace/${listing.slug}`}
                  className="line-clamp-1 font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {listing.title}
                </Link>
                <span className="shrink-0 font-bold text-[var(--color-text)]">
                  ${listing.price.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[listing.status]}`}
                >
                  {statusLabels[listing.status]}
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <Heart size={12} className="fill-red-400 text-red-400" /> {listing._count.favorites}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(listing.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {listing.status === 'active' && (
                  <button
                    onClick={() => updateStatus(listing.id, 'sold')}
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  >
                    <CheckCircle size={12} /> Mark Sold
                  </button>
                )}
                {listing.status !== 'active' && listing.status !== 'removed' && (
                  <button
                    onClick={() => updateStatus(listing.id, 'active')}
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  >
                    Relist
                  </button>
                )}
                <button
                  onClick={() => handleDelete(listing.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
