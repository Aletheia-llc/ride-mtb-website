import { requireAuth } from '@/lib/auth/guards'
import { getMyOffersSent, getMyOffersReceived } from '@/modules/marketplace/actions/offers'
import { OfferList } from '@/modules/marketplace/components/offers/OfferList'

export default async function MyOffersPage() {
  await requireAuth()
  const [sent, received] = await Promise.all([getMyOffersSent(), getMyOffersReceived()])

  return (
    <div>
      <h1>My Offers</h1>
      <OfferList sent={sent} received={received} />
    </div>
  )
}
