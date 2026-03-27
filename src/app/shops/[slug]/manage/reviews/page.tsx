import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { getShopForOwner } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { ReviewsTab } from '@/modules/shops/components/owner/ReviewsTab'
import { respondToReview } from '@/modules/shops/actions/respondToReview'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ReviewsPage({ params }: Props) {
  const { slug } = await params
  // Auth handled by ManageLayout, defense-in-depth
  await requireShopOwner(slug)

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const reviews = await db.shopReview.findMany({
    where: { shopId: shop.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const replyAction = respondToReview.bind(null, slug)

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="reviews"
    >
      <ReviewsTab reviews={reviews} replyAction={replyAction} />
    </DashboardLayout>
  )
}
