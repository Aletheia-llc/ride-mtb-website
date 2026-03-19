import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { CheckoutSuccess } from '@/modules/marketplace/components/checkout/CheckoutSuccess'
import type { TransactionWithDetails } from '@/modules/marketplace/types'

export const metadata = {
  title: 'Order Confirmed | Ride MTB Marketplace',
}

interface CheckoutSuccessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const sp = await searchParams
  const paymentIntentId =
    typeof sp.paymentIntentId === 'string' ? sp.paymentIntentId : undefined

  if (!paymentIntentId) {
    notFound()
  }

  const raw = await db.transaction.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          photos: {
            where: { isCover: true },
            take: 1,
            select: { url: true, isCover: true },
          },
        },
      },
      buyer: { select: { id: true, name: true, image: true } },
    },
  })

  if (!raw) {
    notFound()
  }

  // Shape into TransactionWithDetails — otherParty is the buyer from seller's perspective
  const transaction: TransactionWithDetails = {
    ...raw,
    otherParty: raw.buyer,
  }

  return <CheckoutSuccess transaction={transaction} />
}
