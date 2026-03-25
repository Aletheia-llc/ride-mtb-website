'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  DollarSign,
  RotateCcw,
} from 'lucide-react'
import { AddTrackingForm } from '@/modules/marketplace/components/transaction/AddTrackingForm'
import { DisputeForm } from '@/modules/marketplace/components/transaction/DisputeForm'
import { updateTransactionStatus } from '@/modules/marketplace/actions/transactions'
import type { TransactionWithDetails } from '@/modules/marketplace/types'
import type { TransactionStatus } from '@/modules/marketplace/types'

interface TransactionCardProps {
  transaction: TransactionWithDetails
  role: 'buyer' | 'seller'
}

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending_payment: {
    label: 'Pending Payment',
    color: 'text-amber-600 bg-amber-500/10',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  paid: {
    label: 'Paid',
    color: 'text-blue-500 bg-blue-500/10',
    icon: <DollarSign className="h-3.5 w-3.5" />,
  },
  shipped: {
    label: 'Shipped',
    color: 'text-purple-500 bg-purple-500/10',
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10',
    icon: <Package className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Completed',
    color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  disputed: {
    label: 'Disputed',
    color: 'text-red-500 bg-red-500/10',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  refunded: {
    label: 'Refunded',
    color: 'text-[var(--color-text-muted)] bg-[var(--color-surface-hover)]',
    icon: <RotateCcw className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-[var(--color-text-muted)] bg-[var(--color-surface-hover)]',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

export function TransactionCard({ transaction, role }: TransactionCardProps) {
  const [showTracking, setShowTracking] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const status = transaction.status as TransactionStatus
  const config = STATUS_CONFIG[status]
  const coverPhoto =
    transaction.listing.photos.find((p) => p.isCover) ??
    transaction.listing.photos[0]

  const handleConfirmDelivery = async () => {
    setActionError(null)
    setIsConfirmingDelivery(true)
    try {
      await updateTransactionStatus(transaction.id, 'delivered')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to confirm delivery',
      )
    } finally {
      setIsConfirmingDelivery(false)
    }
  }

  const handleComplete = async () => {
    setActionError(null)
    setIsCompleting(true)
    try {
      await updateTransactionStatus(transaction.id, 'completed')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to complete transaction',
      )
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <Link
          href={`/buy-sell/${transaction.listing.slug}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg"
        >
          {coverPhoto ? (
            <Image
              src={coverPhoto.url}
              alt={transaction.listing.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-hover)]">
              <Package className="h-8 w-8 text-[var(--color-text-muted)]" />
            </div>
          )}
        </Link>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/buy-sell/${transaction.listing.slug}`}
                className="block truncate font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
              >
                {transaction.listing.title}
              </Link>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <span>
                  {role === 'buyer' ? 'Seller' : 'Buyer'}:{' '}
                  {transaction.otherParty.name ?? 'Unknown'}
                </span>
              </div>
            </div>

            {/* Status badge */}
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
            >
              {config.icon}
              {config.label}
            </span>
          </div>

          {/* Price */}
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="font-bold text-[var(--color-primary)]">
              ${Number(transaction.totalCharged).toFixed(2)}
            </span>
            {transaction.trackingNumber && (
              <span className="text-[var(--color-text-muted)]">
                Tracking: {transaction.trackingCarrier?.toUpperCase()}{' '}
                {transaction.trackingNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {actionError && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-500">
          {actionError}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
        {/* Seller: Add tracking when paid */}
        {role === 'seller' && status === 'paid' && (
          <button
            onClick={() => setShowTracking(!showTracking)}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
          >
            {showTracking ? 'Cancel' : 'Add Tracking'}
          </button>
        )}

        {/* Buyer: Confirm delivery when shipped */}
        {role === 'buyer' && status === 'shipped' && (
          <button
            onClick={handleConfirmDelivery}
            disabled={isConfirmingDelivery}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {isConfirmingDelivery ? 'Confirming...' : 'Confirm Delivery'}
          </button>
        )}

        {/* Buyer: Complete & review when delivered */}
        {role === 'buyer' && status === 'delivered' && (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {isCompleting ? 'Completing...' : 'Complete & Review'}
          </button>
        )}

        {/* Either: Open dispute when paid/shipped */}
        {(status === 'paid' || status === 'shipped') && (
          <button
            onClick={() => setShowDispute(!showDispute)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-red-500 hover:text-red-500 cursor-pointer"
          >
            {showDispute ? 'Cancel' : 'Open Dispute'}
          </button>
        )}

        {/* Timestamp */}
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {new Date(transaction.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Expandable forms */}
      {showTracking && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
          <AddTrackingForm
            transactionId={transaction.id}
            onSuccess={() => setShowTracking(false)}
          />
        </div>
      )}
      {showDispute && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
          <DisputeForm
            transactionId={transaction.id}
            onSuccess={() => setShowDispute(false)}
          />
        </div>
      )}
    </div>
  )
}
