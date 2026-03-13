import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { ListingDetail } from '@/modules/marketplace'
// eslint-disable-next-line no-restricted-imports
import { getListingBySlug, isListingFavorited } from '@/modules/marketplace/lib/queries'

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

  const isFavorited = session?.user?.id
    ? await isListingFavorited(listing.id, session.user.id)
    : false

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

      <ListingDetail
        listing={listing}
        favoriteCount={listing.favoriteCount ?? 0}
        isFavorited={isFavorited}
        isLoggedIn={!!session?.user}
      />
    </div>
  )
}
