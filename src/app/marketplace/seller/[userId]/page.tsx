import { notFound } from 'next/navigation'
import { getSellerProfile } from '@/modules/marketplace/actions/seller'
import { SellerProfilePage } from '@/modules/marketplace/components/seller/SellerProfilePage'
import type { Metadata } from 'next'

interface SellerPageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
  const { userId } = await params
  const profile = await getSellerProfile(userId)

  if (!profile) {
    return { title: 'Seller Not Found | Ride MTB Marketplace' }
  }

  const displayName = profile.user.name ?? 'Seller'

  return {
    title: `${displayName}'s Listings | Ride MTB Marketplace`,
    description: `Browse ${displayName}'s active listings on Ride MTB Marketplace. ${profile.totalSales} sales, ${profile.ratingCount} reviews.`,
  }
}

export default async function SellerPage({ params }: SellerPageProps) {
  const { userId } = await params
  const profile = await getSellerProfile(userId)

  if (!profile) {
    notFound()
  }

  return <SellerProfilePage profile={profile} />
}
