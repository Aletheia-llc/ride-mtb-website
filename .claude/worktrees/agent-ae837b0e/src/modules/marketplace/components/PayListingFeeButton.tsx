import { initiateListingPaymentAction } from '../actions/initiateListingPayment'

interface PayListingFeeButtonProps {
  listingId: string
  listingTitle: string
}

export function PayListingFeeButton({ listingId, listingTitle }: PayListingFeeButtonProps) {
  return (
    <form action={initiateListingPaymentAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="listingTitle" value={listingTitle} />
      <button
        type="submit"
        className="w-full rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
      >
        Activate Listing — $2.99
      </button>
      <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
        One-time fee to make your listing visible to buyers
      </p>
    </form>
  )
}
