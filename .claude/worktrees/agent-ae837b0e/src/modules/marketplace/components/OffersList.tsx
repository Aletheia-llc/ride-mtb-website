'use client'

import { useActionState } from 'react'
import { acceptOffer, declineOffer } from '../actions/respondToOffer'

export type OfferItem = {
  id: string
  amount: number
  message: string | null
  status: string
  expiresAt: Date
  createdAt: Date
  buyer: {
    id: string
    name: string | null
    image: string | null
  }
}

interface OffersListProps {
  offers: OfferItem[]
  isSeller: boolean
}

type ActionState = { error?: string; success?: boolean } | null

function OfferActions({ offerId }: { offerId: string }) {
  const [acceptState, acceptAction, acceptPending] = useActionState(
    async (_prev: ActionState, _fd: FormData) => {
      try {
        await acceptOffer(offerId)
        return { success: true }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to accept offer.' }
      }
    },
    null,
  )

  const [declineState, declineAction, declinePending] = useActionState(
    async (_prev: ActionState, _fd: FormData) => {
      try {
        await declineOffer(offerId)
        return { success: true }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to decline offer.' }
      }
    },
    null,
  )

  if (acceptState?.success || declineState?.success) {
    return (
      <span className="text-xs text-[var(--color-text-muted)]">
        {acceptState?.success ? 'Accepted' : 'Declined'}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {(acceptState?.error || declineState?.error) && (
        <span className="text-xs text-red-500">{acceptState?.error ?? declineState?.error}</span>
      )}
      <form action={acceptAction}>
        <button
          type="submit"
          disabled={acceptPending || declinePending}
          className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {acceptPending ? '…' : 'Accept'}
        </button>
      </form>
      <form action={declineAction}>
        <button
          type="submit"
          disabled={acceptPending || declinePending}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
        >
          {declinePending ? '…' : 'Decline'}
        </button>
      </form>
    </div>
  )
}

const statusBadgeClass: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  countered: 'bg-blue-100 text-blue-800',
  withdrawn: 'bg-gray-100 text-gray-600',
  expired: 'bg-gray-100 text-gray-500',
}

export function OffersList({ offers, isSeller }: OffersListProps) {
  if (offers.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-text-muted)]">No offers yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">
        Offers ({offers.length})
      </h3>
      {offers.map((offer) => (
        <div
          key={offer.id}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  ${offer.amount.toLocaleString()}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass[offer.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {offer.status}
                </span>
              </div>
              {isSeller && (
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  From: {offer.buyer.name ?? 'Anonymous'}
                </p>
              )}
              {offer.message && (
                <p className="mt-1 text-sm text-[var(--color-text-muted)] line-clamp-2">
                  {offer.message}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Expires: {new Date(offer.expiresAt).toLocaleDateString()}
              </p>
            </div>

            {isSeller && offer.status === 'pending' && (
              <div className="shrink-0">
                <OfferActions offerId={offer.id} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
