import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { ListingGrid } from '@/modules/marketplace'
// eslint-disable-next-line no-restricted-imports
import { getUserFavoriteListings } from '@/modules/marketplace/lib/queries'
import type { ListingSummary } from '@/modules/marketplace/types'

export const metadata = { title: 'Saved Listings | Marketplace | Ride MTB' }

export default async function FavoritesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const rawListings = await getUserFavoriteListings(session.user.id)

  const listings: ListingSummary[] = rawListings.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    price: l.price,
    category: l.category as ListingSummary['category'],
    condition: l.condition as ListingSummary['condition'],
    location: l.location,
    firstImageUrl: (l.imageUrls as string[])[0] ?? null,
    status: l.status as ListingSummary['status'],
    sellerName: l.seller.name,
    createdAt: l.createdAt,
    favoriteCount: l._count.favorites,
    isFavorited: true,
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <Heart className="h-6 w-6 fill-red-500 text-red-500" />
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Saved Listings</h1>
      </div>
      {listings.length === 0 ? (
        <div className="py-16 text-center text-[var(--color-text-muted)]">
          <Heart className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p className="text-lg font-medium">No saved listings yet</p>
          <p className="mt-1 text-sm">Tap the heart on any listing to save it here.</p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white"
          >
            Browse Listings
          </Link>
        </div>
      ) : (
        <ListingGrid listings={listings} isLoggedIn />
      )}
    </div>
  )
}
