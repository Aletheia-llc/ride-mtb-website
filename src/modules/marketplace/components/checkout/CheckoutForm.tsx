'use client'

// TODO: npm install @stripe/stripe-js @stripe/react-stripe-js
// Stripe Elements will be initialized here once packages are installed.
// Currently uses a direct payment flow via server actions.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Lock } from 'lucide-react'
import { OrderSummary } from './OrderSummary'
import { createTransaction } from '@/modules/marketplace/actions/transactions'
import type { CheckoutData } from '@/modules/marketplace/types'

interface CheckoutFormProps {
  checkoutData: CheckoutData
}

export function CheckoutForm({ checkoutData }: CheckoutFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Shipping address form state
  const [address, setAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  const { listing, salePrice, shippingCost, totalCharged } = checkoutData

  const coverPhoto = listing.photos.find((p) => p.isCover) ?? listing.photos[0]

  const isAddressComplete =
    address.name.trim() !== '' &&
    address.street.trim() !== '' &&
    address.city.trim() !== '' &&
    address.state.trim() !== '' &&
    /^\d{5}$/.test(address.zip)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAddressComplete) return

    setError(null)

    startTransition(async () => {
      try {
        // Create the transaction record
        // Note: In production, stripePaymentIntentId comes from Stripe Elements confirmation.
        // The buyerId is resolved server-side via requireAuth() in the action.
        const tx = await createTransaction(
          listing.id,
          '', // buyerId resolved server-side via requireAuth
          totalCharged,
          'pi_stub', // TODO: replace with real Stripe PaymentIntent ID from Elements
          listing.fulfillment,
        )
        const transactionId = tx.id

        // TODO: In production, use Stripe Elements to confirm payment before
        // creating the transaction:
        // const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        // const { error } = await stripe.confirmPayment({ clientSecret, ... })

        router.push(`/marketplace/checkout/success?transactionId=${transactionId}`)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Payment failed. Please try again.',
        )
      }
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* Left: Form */}
      <div>
        {/* Listing summary */}
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {coverPhoto && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={coverPhoto.url}
                alt={listing.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-[var(--color-text)]">
              {listing.title}
            </h3>
            <p className="text-lg font-bold text-[var(--color-primary)]">
              ${salePrice.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Shipping address */}
        <form onSubmit={handleSubmit}>
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">
            Shipping Address
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={address.name}
                onChange={(e) =>
                  setAddress((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="street"
                className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]"
              >
                Street Address
              </label>
              <input
                id="street"
                type="text"
                required
                value={address.street}
                onChange={(e) =>
                  setAddress((prev) => ({ ...prev, street: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label
                  htmlFor="city"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]"
                >
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                  placeholder="Denver"
                />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]"
                >
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  required
                  maxLength={2}
                  value={address.state}
                  onChange={(e) =>
                    setAddress((prev) => ({
                      ...prev,
                      state: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                  placeholder="CO"
                />
              </div>

              <div>
                <label
                  htmlFor="zip"
                  className="mb-1.5 block text-sm font-medium text-[var(--color-text-muted)]"
                >
                  ZIP Code
                </label>
                <input
                  id="zip"
                  type="text"
                  required
                  maxLength={5}
                  pattern="\d{5}"
                  value={address.zip}
                  onChange={(e) =>
                    setAddress((prev) => ({
                      ...prev,
                      zip: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] focus:border-[var(--color-primary)] focus:outline-none"
                  placeholder="80202"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !isAddressComplete}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pay ${totalCharged.toFixed(2)}
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-[var(--color-dim)]">
            Payments are processed securely by Stripe
          </p>
        </form>
      </div>

      {/* Right: Order summary */}
      <div className="lg:sticky lg:top-20">
        <OrderSummary
          salePrice={salePrice}
          shippingCost={shippingCost}
          totalCharged={totalCharged}
        />
      </div>
    </div>
  )
}
