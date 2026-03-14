'use client'

import { useActionState } from 'react'
import { makeOffer } from '../actions/makeOffer'

interface OfferFormProps {
  listingId: string
  askingPrice: number
  acceptsOffers: boolean
}

type OfferState = {
  error?: string
  success?: boolean
} | null

async function submitOffer(
  _prevState: OfferState,
  formData: FormData,
): Promise<OfferState> {
  const listingId = formData.get('listingId') as string
  const amountStr = formData.get('amount') as string
  const message = (formData.get('message') as string) || undefined

  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid offer amount.' }
  }

  try {
    await makeOffer({ listingId, amount, message })
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to submit offer.' }
  }
}

export function OfferForm({ listingId, askingPrice, acceptsOffers }: OfferFormProps) {
  const [state, formAction, isPending] = useActionState(submitOffer, null)

  if (!acceptsOffers) return null

  if (state?.success) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm font-medium text-green-600">Offer submitted! The seller will respond within 72 hours.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Make an Offer</h3>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="listingId" value={listingId} />

        <div>
          <label htmlFor="offer-amount" className="mb-1 block text-xs text-[var(--color-text-muted)]">
            Your offer (asking: ${askingPrice.toLocaleString()})
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-[var(--color-text-muted)]">$</span>
            <input
              id="offer-amount"
              name="amount"
              type="number"
              min="1"
              max="999999"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="offer-message" className="mb-1 block text-xs text-[var(--color-text-muted)]">
            Message (optional)
          </label>
          <textarea
            id="offer-message"
            name="message"
            rows={3}
            maxLength={1000}
            placeholder="Introduce yourself or explain your offer..."
            className="w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        {state?.error && (
          <p className="text-xs text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Submitting…' : 'Submit Offer'}
        </button>
      </form>
    </div>
  )
}
