import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { SellerManager } from '@/modules/marketplace/components/admin/SellerManager'
import type { AdminSellerWithDetails } from '@/modules/marketplace/types'

export const metadata = {
  title: 'Sellers | Marketplace Admin | Ride MTB',
}

export default async function AdminSellersPage() {
  await requireAdmin()

  const rawSellers = await db.sellerProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Count active listings per seller via the User.sellerId foreign key on Listing
  const listingCounts = await db.listing.groupBy({
    by: ['sellerId'],
    _count: { id: true },
    where: { sellerId: { in: rawSellers.map((s) => s.userId) } },
  })

  const countMap = new Map(
    listingCounts.map((row) => [row.sellerId, row._count.id]),
  )

  const sellers: AdminSellerWithDetails[] = rawSellers.map((s) => ({
    id: s.id,
    userId: s.userId,
    user: s.user,
    isVerified: s.isVerified,
    isTrusted: s.isTrusted,
    totalSales: s.totalSales,
    averageRating: s.averageRating ? Number(s.averageRating) : null,
    ratingCount: s.ratingCount,
    createdAt: s.createdAt,
    _count: { listings: countMap.get(s.userId) ?? 0 },
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Sellers
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {sellers.length} registered seller{sellers.length !== 1 ? 's' : ''}
        </p>
      </div>
      <SellerManager initialSellers={sellers} />
    </div>
  )
}
