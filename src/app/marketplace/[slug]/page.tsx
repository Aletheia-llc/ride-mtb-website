import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { ListingDetail } from '@/modules/marketplace'
// eslint-disable-next-line no-restricted-imports
import { getListingBySlug, isListingFavorited, getListingOffers, getSellerProfileByUserId } from '@/modules/marketplace/lib/queries'
import { OfferForm } from '@/modules/marketplace/components/OfferForm'
import { OffersList } from '@/modules/marketplace/components/OffersList'
import { SellerProfileCard } from '@/modules/marketplace/components/SellerProfileCard'

interface ListingPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) return { title: 'Listing Not Found | Marketplace | Ride MTB' }

  return {
    title: `${listing.title} | Marketplace | Ride MTB`,
    description: listing.description.slice(0, 160),
  }
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { slug } = await params
  const [listing, session] = await Promise.all([
    getListingBySlug(slug),
    auth(),
  ])

  if (!listing) notFound()

  const userId = session?.user?.id

  const [isFavorited, offers, sellerProfile] = await Promise.all([
    userId ? isListingFavorited(listing.id, userId) : Promise.resolve(false),
    userId ? getListingOffers(listing.id, userId) : Promise.resolve([]),
    getSellerProfileByUserId(listing.sellerId),
  ])

  const isOwnListing = userId === listing.sellerId

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main listing detail */}
        <div className="lg:col-span-2">
          <ListingDetail
            listing={listing}
            favoriteCount={listing.favoriteCount ?? 0}
            isFavorited={isFavorited}
            isLoggedIn={!!session?.user}
            currentUserId={userId}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Seller profile */}
          <SellerProfileCard
            profile={sellerProfile}
            sellerName={listing.seller.name}
          />

          {/* Offer form — only for signed-in non-owners */}
          {userId && !isOwnListing && listing.status === 'active' && (
            <OfferForm
              listingId={listing.id}
              askingPrice={listing.price}
              acceptsOffers={(listing as { acceptsOffers?: boolean }).acceptsOffers ?? true}
            />
          )}

          {/* Offers list — seller sees all offers, buyer sees their own */}
          {userId && offers.length > 0 && (
            <OffersList
              offers={offers.map((o) => ({
                id: o.id,
                amount: o.amount,
                message: o.message,
                status: o.status,
                expiresAt: o.expiresAt,
                createdAt: o.createdAt,
                buyer: o.buyer,
              }))}
              isSeller={isOwnListing}
            />
          )}
        </div>
      </div>
    </div>
  )
}
