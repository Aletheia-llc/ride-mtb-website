'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Check,
  X,
  Star,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { AdminListingWithDetails } from '@/modules/marketplace/types'
import {
  approveListings,
  removeListings,
} from '@/modules/marketplace/actions/admin'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]',
  pending_review: 'bg-amber-500/20 text-amber-600',
  active: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]',
  sold: 'bg-blue-500/20 text-blue-500',
  reserved: 'bg-purple-500/20 text-purple-500',
  expired: 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]',
  removed: 'bg-red-500/20 text-red-500',
  cancelled: 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  active: 'Active',
  sold: 'Sold',
  reserved: 'Reserved',
  expired: 'Expired',
  removed: 'Removed',
  cancelled: 'Cancelled',
}

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
  { value: 'removed', label: 'Removed' },
]

interface AdminListingTableProps {
  initialListings: AdminListingWithDetails[]
  initialTotal: number
  initialPages: number
  initialStatus: string
  initialPage: number
}

export function AdminListingTable({
  initialListings,
  initialTotal,
  initialPages,
  initialStatus,
  initialPage,
}: AdminListingTableProps) {
  const [listings, setListings] = useState(initialListings)
  const [total] = useState(initialTotal)
  const [pages] = useState(initialPages)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [page, setPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()

  function handleFilterChange(newStatus: string) {
    setStatusFilter(newStatus)
    setPage(1)
    const params = new URLSearchParams()
    if (newStatus !== 'all') params.set('status', newStatus)
    params.set('page', '1')
    window.location.href = `/marketplace/admin/listings?${params.toString()}`
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    params.set('page', String(newPage))
    window.location.href = `/marketplace/admin/listings?${params.toString()}`
  }

  function handleApprove(listingId: string) {
    startTransition(async () => {
      await approveListings(listingId)
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: 'active' } : l)),
      )
    })
  }

  function handleRemove(listingId: string) {
    const reason = prompt('Reason for removal:')
    if (!reason) return
    startTransition(async () => {
      await removeListings(listingId, reason)
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: 'removed' } : l)),
      )
    })
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleFilterChange(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {total} listing{total !== 1 ? 's' : ''} found
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Listing</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Seller</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)] text-center">
                Reports
              </th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Date</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)] text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                >
                  No listings found.
                </td>
              </tr>
            ) : (
              listings.map((listing) => (
                <tr
                  key={listing.id}
                  className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  {/* Listing */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)]">
                        {listing.photos[0] ? (
                          <Image
                            src={listing.photos[0].url}
                            alt={listing.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)] text-xs">
                            No img
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/marketplace/${listing.slug}`}
                          className="block truncate font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                        >
                          {listing.title}
                        </Link>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          ${parseFloat(String(listing.price)).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Seller */}
                  <td className="px-4 py-3">
                    <span className="text-[var(--color-text-muted)]">
                      {listing.seller.name ?? listing.seller.email ?? 'Unknown'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[listing.status] ?? 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {STATUS_LABELS[listing.status] ?? listing.status}
                    </span>
                    {listing.isFeatured && (
                      <Star className="ml-1.5 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                  </td>

                  {/* Reports */}
                  <td className="px-4 py-3 text-center">
                    {listing._count.reports > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {listing._count.reports}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">0</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {listing.status === 'pending_review' && (
                        <button
                          onClick={() => handleApprove(listing.id)}
                          disabled={isPending}
                          title="Approve"
                          className="rounded-lg p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {listing.status !== 'removed' &&
                        listing.status !== 'cancelled' && (
                          <button
                            onClick={() => handleRemove(listing.id)}
                            disabled={isPending}
                            title="Remove"
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      {/* Feature toggle placeholder — requires featureListing action */}
                      <button
                        disabled
                        title={listing.isFeatured ? 'Unfeature' : 'Feature'}
                        className={`rounded-lg p-1.5 transition-colors cursor-not-allowed opacity-40 ${
                          listing.isFeatured
                            ? 'text-amber-400'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
