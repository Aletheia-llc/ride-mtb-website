import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getListingDetail } from '@/modules/marketplace/actions/listings'
import { createPaymentIntent } from '@/modules/marketplace/actions/stripe-connect'
import { CheckoutForm } from '@/modules/marketplace/components/checkout/CheckoutForm'
import { OrderSummary } from '@/modules/marketplace/components/checkout/OrderSummary'
import type { CheckoutData } from '@/modules/marketplace/types'

interface CheckoutPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata = {
  title: 'Checkout | Ride MTB Marketplace',
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  await requireAuth()

  const { slug } = await params
  const sp = await searchParams

  const offerId = typeof sp.offerId === 'string' ? sp.offerId : undefined

  const listing = await getListingDetail(slug)

  if (!listing) {
    notFound()
  }

  let clientSecret: string
  let paymentIntentId: string
  try {
    ;({ clientSecret, paymentIntentId } = await createPaymentIntent(
      listing.id,
      offerId,
    ))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to process checkout.'
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-bold text-[var(--color-text)]">Checkout</h1>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {message}
        </div>
      </div>
    )
  }

  const shippingCost = Number(listing.shippingCost ?? 0)
  const salePrice = Number(listing.price)
  const feePercent = 5
  const platformFee = Math.round((salePrice + shippingCost) * (feePercent / 100) * 100) / 100
  const totalCharged = salePrice + shippingCost
  const sellerPayout = totalCharged - platformFee

  const checkoutData: CheckoutData = {
    listing,
    salePrice,
    shippingCost,
    platformFee,
    sellerPayout,
    totalCharged,
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-[var(--color-text)]">
        Checkout
      </h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <CheckoutForm checkoutData={checkoutData} />
        <aside>
          <OrderSummary
            salePrice={salePrice}
            shippingCost={shippingCost}
            totalCharged={totalCharged}
          />
        </aside>
      </div>
      {/* paymentIntentId passed via hidden input or stored for reference */}
      <input type="hidden" name="paymentIntentId" value={paymentIntentId} />
      <input type="hidden" name="clientSecret" value={clientSecret} />
    </div>
  )
}
