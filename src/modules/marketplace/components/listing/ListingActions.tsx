'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { startConversation } from '@/modules/marketplace/actions/messages'
import { deleteListing, bumpListing } from '@/modules/marketplace/actions/listing-mutations'

interface ListingActionsProps {
  listingId: string
  sellerId: string
  acceptsOffers: boolean
  listingPrice: number
  /** slug for edit link (owner only) */
  listingSlug?: string
}

export function ListingActions({
  listingId,
  sellerId,
  acceptsOffers,
  listingSlug,
}: ListingActionsProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isMessagePending, startMessageTransition] = useTransition()
  const [isBumpPending, startBumpTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [offerModalOpen, setOfferModalOpen] = useState(false)

  const isOwner = session?.user?.id === sellerId
  const isPending = isMessagePending || isBumpPending || isDeletePending

  function handleMessageSeller() {
    if (status !== 'authenticated') {
      router.push('/api/auth/signin')
      return
    }
    startMessageTransition(async () => {
      try {
        const result = await startConversation(listingId, 'Hi, is this still available?')
        router.push(`/marketplace/messages/${result.conversationId}`)
      } catch (error) {
        console.error('Failed to start conversation:', error)
      }
    })
  }

  function handleMakeOffer() {
    if (status !== 'authenticated') {
      router.push('/api/auth/signin')
      return
    }
    setOfferModalOpen(true)
  }

  function handleBump() {
    startBumpTransition(async () => {
      try {
        await bumpListing(listingId)
      } catch (error) {
        console.error('Failed to bump listing:', error)
      }
    })
  }

  function handleDelete() {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    startDeleteTransition(async () => {
      try {
        await deleteListing(listingId)
        router.push('/marketplace/my')
      } catch (error) {
        console.error('Failed to delete listing:', error)
      }
    })
  }

  if (isOwner) {
    return (
      <div className="flex flex-col gap-2">
        <p className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">
          This is your listing
        </p>
        <div className="flex gap-2">
          {listingSlug && (
            <Link
              href={`/marketplace/sell/${listingId}/edit`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          )}
          <button
            type="button"
            onClick={handleBump}
            disabled={isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-muted)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/20 disabled:opacity-50"
          >
            {isBumpPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            Bump
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            {isDeletePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleMessageSeller}
          disabled={isMessagePending}
          className="w-full cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {isMessagePending ? 'Starting conversation…' : 'Message Seller'}
        </button>

        {acceptsOffers && (
          <button
            type="button"
            onClick={handleMakeOffer}
            className="w-full cursor-pointer rounded-lg border border-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-muted)]"
          >
            Make an Offer
          </button>
        )}
      </div>

      {/* MakeOfferModal will be migrated in Task 12 — placeholder state kept */}
      {offerModalOpen && (
        <div className="sr-only" aria-hidden="true" data-offer-modal-placeholder="true" />
      )}
    </>
  )
}
