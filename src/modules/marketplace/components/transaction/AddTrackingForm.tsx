'use client'

import { useState, useTransition } from 'react'
import { Loader2, Truck } from 'lucide-react'
import { addTracking } from '@/modules/marketplace/actions/transactions'

interface AddTrackingFormProps {
  transactionId: string
  onSuccess: () => void
}

const CARRIERS = [
  { value: 'usps', label: 'USPS' },
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'other', label: 'Other' },
]

export function AddTrackingForm({
  transactionId,
  onSuccess,
}: AddTrackingFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!carrier || !trackingNumber.trim()) return

    setError(null)
    startTransition(async () => {
      try {
        // monolith: addTracking(transactionId, trackingNumber, carrier)
        await addTracking(transactionId, trackingNumber.trim(), carrier)
        onSuccess()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to add tracking number',
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
        <Truck className="h-4 w-4 text-[var(--color-primary)]" />
        Add Tracking Information
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-3">
        <div>
          <label
            htmlFor={`carrier-${transactionId}`}
            className="mb-1 block text-xs text-[var(--color-text-muted)]"
          >
            Carrier
          </label>
          <select
            id={`carrier-${transactionId}`}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none cursor-pointer"
          >
            <option value="">Select...</option>
            {CARRIERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`tracking-${transactionId}`}
            className="mb-1 block text-xs text-[var(--color-text-muted)]"
          >
            Tracking Number
          </label>
          <input
            id={`tracking-${transactionId}`}
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            required
            placeholder="e.g. 9400111899223456789012"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !carrier || !trackingNumber.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Tracking'
        )}
      </button>
    </form>
  )
}
