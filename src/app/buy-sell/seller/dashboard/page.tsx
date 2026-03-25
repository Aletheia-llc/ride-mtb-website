import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getMySellerProfile } from '@/modules/marketplace/actions/seller'
import { getMyListings } from '@/modules/marketplace/actions/listings'
import { SellerDashboard } from '@/modules/marketplace/components/seller/SellerDashboard'
import { db } from '@/lib/db/client'
import type { SellerDashboardData } from '@/modules/marketplace/types'

export const metadata = {
  title: 'Seller Dashboard | Ride MTB Marketplace',
}

export default async function SellerDashboardPage() {
  const user = await requireAuth()

  const profile = await getMySellerProfile()

  if (!profile) {
    redirect('/buy-sell/seller/onboarding')
  }

  // Gather stats in parallel
  const [myListings, soldListings, pendingOffers, thisMonthSalesCount] =
    await Promise.all([
      getMyListings(user.id!),
      db.listing.count({ where: { sellerId: user.id!, status: 'sold' } }),
      db.offer.count({
        where: { listing: { sellerId: user.id! }, status: 'pending' },
      }),
      db.transaction.count({
        where: {
          sellerId: user.id!,
          status: 'completed',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ])

  const activeListings = myListings.filter((l) => l.status === 'active').length

  const data: SellerDashboardData = {
    profile,
    stats: {
      activeListings,
      soldListings,
      totalRevenue: profile.totalRevenue,
      thisMonthSales: thisMonthSalesCount,
      pendingOffers,
    },
    recentReviews: profile.reviews.slice(0, 5),
  }

  return <SellerDashboard data={data} />
}
