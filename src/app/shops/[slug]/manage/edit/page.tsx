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
  // Auth is handled by ManageLayout — no duplicate check needed

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const boundAction = updateShop.bind(null, slug)

  const shopForEdit = {
    ...shop,
    services: Array.isArray(shop.services) ? (shop.services as string[]) : [],
    brands: Array.isArray(shop.brands) ? (shop.brands as string[]) : [],
  }

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="edit"
    >
      <EditTab shop={shopForEdit} action={boundAction} />
    </DashboardLayout>
  )
}
