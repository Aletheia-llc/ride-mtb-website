'use client'

import { useState } from 'react'
import type { CreditTransactionType } from '@/generated/prisma/client'

type Transaction = {
  id: string
  type: CreditTransactionType
  amount: number
  description: string
  createdAt: string
}

interface TransactionListProps {
  initialTransactions: Transaction[]
  initialTotal: number
  pageSize: number
}

const TYPE_LABEL: Record<CreditTransactionType, string> = {
  EARNED: 'Earned',
  TIP_SENT: 'Tip Sent',
  TIP_RECEIVED: 'Tip Received',
  PURCHASE: 'Purchase',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
}

const TYPE_COLOR: Record<CreditTransactionType, string> = {
  EARNED: 'text-green-500',
  TIP_RECEIVED: 'text-green-500',
  REFUND: 'text-green-500',
  TIP_SENT: 'text-[var(--color-text-muted)]',
  PURCHASE: 'text-[var(--color-text-muted)]',
  ADJUSTMENT: 'text-[var(--color-text-muted)]',
}

export function TransactionList({ initialTransactions, initialTotal, pageSize }: TransactionListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  async function loadPage(newPage: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/credits/transactions?page=${newPage}&pageSize=${pageSize}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions)
        setTotal(data.total)
        setPage(newPage)
      }
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">Transaction History</h2>

      {transactions.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          No transactions yet.
        </p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-[var(--color-text)]">{tx.description}</div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5">
                    {TYPE_LABEL[tx.type]}
                  </span>
                  <span>
                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <span className={`text-sm font-bold tabular-nums ${TYPE_COLOR[tx.type]}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => loadPage(page - 1)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-[var(--color-text-muted)]">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => loadPage(page + 1)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
