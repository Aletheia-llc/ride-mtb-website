'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import type { AdminTransactionWithDetails } from '@/modules/marketplace/types'

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-amber-500/20 text-amber-600',
  paid: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]',
  shipped: 'bg-blue-500/20 text-blue-500',
  delivered: 'bg-blue-500/20 text-blue-500',
  completed: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]',
  disputed: 'bg-red-500/20 text-red-500',
  refunded: 'bg-purple-500/20 text-purple-500',
  cancelled: 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]',
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'disputed', label: 'Disputed' },
]

interface TransactionManagerProps {
  initialTransactions: AdminTransactionWithDetails[]
}

export function TransactionManager({
  initialTransactions,
}: TransactionManagerProps) {
  const [transactions] = useState(initialTransactions)
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered =
    statusFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.status === statusFilter)

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16">
        <CreditCard className="h-10 w-10 text-[var(--color-text-muted)]" />
        <p className="text-[var(--color-text-muted)]">No transactions yet</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
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

      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Listing</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Buyer</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Seller</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)] text-right">
                Amount
              </th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {/* Listing */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-[var(--color-surface)]">
                      {tx.listing.photos[0] ? (
                        <Image
                          src={tx.listing.photos[0].url}
                          alt={tx.listing.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] text-[var(--color-text-muted)]">
                          ?
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/marketplace/${tx.listing.slug}`}
                      className="truncate text-[var(--color-text)] hover:text-[var(--color-primary)] max-w-[140px]"
                    >
                      {tx.listing.title}
                    </Link>
                  </div>
                </td>

                {/* Buyer */}
                <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                  {tx.buyer.name ?? tx.buyer.email ?? 'Unknown'}
                </td>

                {/* Seller */}
                <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                  {tx.seller.name ?? tx.seller.email ?? 'Unknown'}
                </td>

                {/* Amount */}
                <td className="px-4 py-3 text-right font-medium text-[var(--color-text)] whitespace-nowrap">
                  ${parseFloat(String(tx.totalCharged)).toFixed(2)}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[tx.status] ?? 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {STATUS_LABELS[tx.status] ?? tx.status}
                  </span>
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
