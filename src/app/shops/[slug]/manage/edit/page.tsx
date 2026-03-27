import { requireShopOwner } from '@/lib/auth/guards'
import { getShopForOwner } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { EditTab } from '@/modules/shops/components/owner/EditTab'
import { updateShop } from '@/modules/shops/actions/updateShop'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditPage({ params }: Props) {
  const { slug } = await params
  await requireShopOwner(slug) // auth guard

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const boundAction = updateShop.bind(null, slug)

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="edit"
    >
      <EditTab shop={shop} action={boundAction} />
    </DashboardLayout>
  )
}
