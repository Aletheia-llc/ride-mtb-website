'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Lock } from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { OrderSummary } from './OrderSummary'
import { createTransaction } from '@/modules/marketplace/actions/transactions'
import type { CheckoutData } from '@/modules/marketplace/types'

// Lazily initialised so the publishable key is only read on the client
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ── Inner form — uses Stripe hooks, rendered inside <Elements> ──────────────

interface InnerProps {
  checkoutData: CheckoutData
}

function CheckoutFormInner({ checkoutData }: InnerProps) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [address, setAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  const { listing, salePrice, shippingCost, totalCharged, paymentIntentId } = checkoutData

  const coverPhoto = listing.photos.find((p) => p.isCover) ?? listing.photos[0]

  const isAddressComplete =
    address.name.trim() !== '' &&
    address.street.trim() !== '' &&
    address.city.trim() !== '' &&
    address.state.trim() !== '' &&
    /^\d{5}$/.test(address.zip)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || !isAddressComplete) return

    setError(null)

    startTransition(async () => {
      try {
        // Confirm payment — only redirects if 3DS or bank redirect is required
        const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/buy-sell/checkout/success?paymentIntentId=${paymentIntentId}`,
            payment_method_data: {
              billing_details: {
                name: address.name,
                address: {
                  line1: address.street,
                  city: address.city,
                  state: address.state,
                  postal_code: address.zip,
                  country: 'US',
                },
              },
            },
          },
          redirect: 'if_required',
        })

        if (stripeError) {
          setError(stripeError.message ?? 'Payment failed. Please try again.')
          return
        }

        // Payment succeeded without a redirect — create the transaction record
        if (paymentIntent?.status === 'succeeded') {
          await createTransaction(
            listing.id,
            '', // resolved server-side via requireAuth
            totalCharged,
            paymentIntent.id,
            listing.fulfillment,
          )
          router.push(`/buy-sell/checkout/success?paymentIntentId=${paymentIntent.id}`)
        }
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Shipping address */}
          <div>
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
          </div>

          {/* Payment details via Stripe Elements */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-[var(--color-text)]">
              Payment Details
            </h2>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <PaymentElement
                options={{
                  layout: 'tabs',
                }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !stripe || !elements || !isAddressComplete}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="text-center text-xs text-[var(--color-dim)]">
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

// ── Public component — provides Elements context ────────────────────────────

interface CheckoutFormProps {
  checkoutData: CheckoutData
}

export function CheckoutForm({ checkoutData }: CheckoutFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: checkoutData.clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#22c55e',
            colorBackground: 'var(--color-bg)',
            colorText: 'var(--color-text)',
            borderRadius: '8px',
          },
        },
      }}
    >
      <CheckoutFormInner checkoutData={checkoutData} />
    </Elements>
  )
}
