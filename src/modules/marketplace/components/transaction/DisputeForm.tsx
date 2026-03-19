'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { updateTransactionStatus } from '@/modules/marketplace/actions/transactions'

interface DisputeFormProps {
  transactionId: string
  onSuccess: () => void
}

const DISPUTE_REASONS = [
  { value: 'not_received', label: 'Item not received' },
  { value: 'not_as_described', label: 'Item not as described' },
  { value: 'damaged_in_shipping', label: 'Damaged in shipping' },
  { value: 'other', label: 'Other' },
]

export function DisputeForm({ transactionId, onSuccess }: DisputeFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason || details.trim().length < 20) return

    setError(null)
    startTransition(async () => {
      try {
        // Disputes are a Transaction status in the monolith
        await updateTransactionStatus(transactionId, 'disputed')
        onSuccess()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to open dispute',
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-red-500">
        <AlertTriangle className="h-4 w-4" />
        Open a Dispute
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        Please describe your issue in detail. Our team will review your dispute
        within 48 hours.
      </p>

      <div>
        <label
          htmlFor={`dispute-reason-${transactionId}`}
          className="mb-1 block text-xs text-[var(--color-text-muted)]"
        >
          Reason
        </label>
        <select
          id={`dispute-reason-${transactionId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none cursor-pointer"
        >
          <option value="">Select a reason...</option>
          {DISPUTE_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`dispute-details-${transactionId}`}
          className="mb-1 block text-xs text-[var(--color-text-muted)]"
        >
          Details (min 20 characters)
        </label>
        <textarea
          id={`dispute-details-${transactionId}`}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          required
          rows={3}
          placeholder="Please describe your issue in detail..."
          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {details.length}/20 characters minimum
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !reason || details.trim().length < 20}
        className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Dispute'
        )}
      </button>
    </form>
  )
}
