import { requireShopOwner } from '@/lib/auth/guards'
import { getShopForOwner, getShopLeadSummary, getShopLeadsByDay } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { AnalyticsTab } from '@/modules/shops/components/owner/AnalyticsTab'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { slug } = await params
  // Auth handled by ManageLayout, defense-in-depth
  await requireShopOwner(slug)

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const [summary, byDay] = await Promise.all([
    getShopLeadSummary(shop.id),
    getShopLeadsByDay(shop.id, 30),
  ])

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="analytics"
    >
      <AnalyticsTab summary={summary} byDay={byDay} />
    </DashboardLayout>
  )
}
