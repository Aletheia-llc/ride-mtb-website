'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { X, DollarSign } from 'lucide-react'
import { makeOffer } from '@/modules/marketplace/actions/offers'

interface MakeOfferModalProps {
  listingId: string
  listingPrice: number
  open: boolean
  onClose: () => void
}

export function MakeOfferModal({
  listingId,
  listingPrice,
  open,
  onClose,
}: MakeOfferModalProps) {
  const [amount, setAmount] = useState(() => Math.round(listingPrice * 0.8))
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [open])

  // Reset state when re-opened
  useEffect(() => {
    if (open) {
      setAmount(Math.round(listingPrice * 0.8))
      setMessage('')
      setError(null)
      setSuccess(false)
    }
  }, [open, listingPrice])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        await makeOffer(listingId, amount, message || undefined)
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to make offer.')
      }
    })
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  const percentOfAsking =
    listingPrice > 0 ? Math.round((amount / listingPrice) * 100) : 0

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 m-auto h-fit w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text)] backdrop:bg-black/60"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            Make an Offer
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20">
              <DollarSign className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-primary)]">
              Offer submitted successfully!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Asking price info */}
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3">
              <span className="text-xs text-[var(--color-text-muted)]">
                Asking price
              </span>
              <span className="ml-2 text-sm font-semibold text-[var(--color-text)]">
                ${listingPrice.toLocaleString()}
              </span>
            </div>

            {/* Amount input */}
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">
              Your offer
            </label>
            <div className="relative mb-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={1}
                max={999999}
                step={1}
                required
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-7 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              {percentOfAsking}% of asking price
            </p>

            {/* Message textarea */}
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Add a message to the seller..."
              className="mb-4 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || amount <= 0}
                className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
