'use client'

import { useActionState } from 'react'
import { requestPayout } from '../actions/requestPayout'

interface Transaction {
  id: string
  amountCents: number
  type: string
  createdAt: Date
}

interface WalletTabProps {
  balanceCents: number
  transactions: Transaction[]
  hasPendingPayout: boolean
}

type PayoutState = { errors: Record<string, string>; success?: boolean }

export function WalletTab({ balanceCents, transactions, hasPendingPayout }: WalletTabProps) {
  const [state, formAction, pending] = useActionState<PayoutState, FormData>(
    async (_prev: PayoutState, _fd: FormData) =>
      requestPayout({ amountCents: 5000 }), // minimum payout
    { errors: {} },
  )

  const balanceDollars = (balanceCents / 100).toFixed(2)
  const canPayout = balanceCents >= 5000 && !hasPendingPayout

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Available Balance
        </p>
        <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">${balanceDollars}</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Minimum payout: $50.00</p>

        {hasPendingPayout && (
          <p className="mt-3 text-xs text-yellow-600">A payout request is pending processing.</p>
        )}

        {state.success && (
          <p className="mt-3 text-xs text-green-600">Payout requested! Admin will process within 3-5 business days.</p>
        )}

        {!hasPendingPayout && !state.success && (
          <form action={formAction} className="mt-4">
            <button
              type="submit"
              disabled={!canPayout || pending}
              className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? 'Requesting…' : 'Request Payout ($50 min)'}
            </button>
            {state.errors.general && (
              <p className="mt-2 text-xs text-red-500">{state.errors.general}</p>
            )}
          </form>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div>
                  <span className="text-sm capitalize text-[var(--color-text)]">{tx.type}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${tx.amountCents >= 0 ? 'text-green-600' : 'text-red-500'}`}
                >
                  {tx.amountCents >= 0 ? '+' : ''}${(tx.amountCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
