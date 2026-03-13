import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, LayoutDashboard } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { getSellerListings } from '@/modules/marketplace/lib/queries'
import { SellerDashboard } from '@/modules/marketplace/components/SellerDashboard'

export const metadata = { title: 'My Listings | Marketplace | Ride MTB' }

export default async function MarketplaceDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const listings = await getSellerListings(session.user.id)

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === 'active').length,
    sold: listings.filter((l) => l.status === 'sold').length,
    totalFavorites: listings.reduce((sum, l) => sum + l._count.favorites, 0),
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-[var(--color-primary)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Listings</h1>
        </div>
        <Link
          href="/marketplace/create"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} /> New Listing
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Sold', value: stats.sold },
          { label: 'Favorites', value: stats.totalFavorites },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-[var(--color-border)] p-3 text-center">
            <div className="text-2xl font-bold text-[var(--color-text)]">{value}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
          </div>
        ))}
      </div>

      <SellerDashboard listings={listings} />
    </div>
  )
}
