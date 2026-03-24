'use client'

import { useState, useTransition } from 'react'
import { Check, X, ArrowLeftRight, Loader2 } from 'lucide-react'
import {
  acceptOffer,
  declineOffer,
  counterOffer,
  withdrawOffer,
} from '@/modules/marketplace/actions/offers'

interface OfferActionsProps {
  offerId: string
  role: 'buyer' | 'seller'
  status: string
}

export function OfferActions({ offerId, role, status }: OfferActionsProps) {
  const [showCounter, setShowCounter] = useState(false)
  const [counterAmount, setCounterAmount] = useState<number>(0)
  const [counterMessage, setCounterMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (status !== 'pending') return null

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      try {
        await acceptOffer(offerId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to accept offer.')
      }
    })
  }

  function handleDecline() {
    setError(null)
    startTransition(async () => {
      try {
        await declineOffer(offerId)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to decline offer.',
        )
      }
    })
  }

  function handleCounter() {
    if (counterAmount <= 0) {
      setError('Please enter a valid counter amount.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await counterOffer(offerId, counterAmount, counterMessage || undefined)
        setShowCounter(false)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to counter offer.',
        )
      }
    })
  }

  function handleWithdraw() {
    setError(null)
    startTransition(async () => {
      try {
        await withdrawOffer(offerId)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to withdraw offer.',
        )
      }
    })
  }

  return (
    <div className="mt-3">
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-500">
          {error}
        </div>
      )}

      {role === 'seller' && (
        <>
          {!showCounter ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Accept
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Decline
              </button>
              <button
                type="button"
                onClick={() => setShowCounter(true)}
                disabled={isPending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Counter
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                Counter amount
              </label>
              <div className="relative mb-2">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
                  $
                </span>
                <input
                  type="number"
                  value={counterAmount || ''}
                  onChange={(e) => setCounterAmount(Number(e.target.value))}
                  min={1}
                  max={999999}
                  step={1}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-6 pr-3 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  placeholder="Enter amount"
                  autoFocus
                />
              </div>
              <textarea
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Add a message (optional)"
                className="mb-2 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCounter(false)}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCounter}
                  disabled={isPending || counterAmount <= 0}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="h-3 w-3" />
                  )}
                  Send Counter
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {role === 'buyer' && (
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          Withdraw Offer
        </button>
      )}
    </div>
  )
}
