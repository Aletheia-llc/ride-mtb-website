import { notFound } from 'next/navigation'
import { getListingDetail } from '@/modules/marketplace/actions/listings'
import { ListingDetail } from '@/modules/marketplace/components/listing/ListingDetail'
import type { Metadata } from 'next'

interface ListingPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListingDetail(slug)

  if (!listing) {
    return { title: 'Listing Not Found | Ride MTB Marketplace' }
  }

  const coverPhoto = listing.photos.find((p) => p.isCover) ?? listing.photos[0]

  return {
    title: `${listing.title} | Ride MTB Marketplace`,
    description: listing.description?.slice(0, 160) ?? `${listing.title} for sale on Ride MTB.`,
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 160) ?? undefined,
      images: coverPhoto ? [{ url: coverPhoto.url }] : [],
    },
  }
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { slug } = await params
  const listing = await getListingDetail(slug)

  if (!listing) {
    notFound()
  }

  return <ListingDetail listing={listing} />
}
