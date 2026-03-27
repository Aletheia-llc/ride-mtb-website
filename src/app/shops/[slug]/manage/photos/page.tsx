import { requireShopOwner } from '@/lib/auth/guards'
import { getShopForOwner } from '@/modules/shops/lib/queries'
import { DashboardLayout } from '@/modules/shops/components/owner/DashboardLayout'
import { PhotosTab } from '@/modules/shops/components/owner/PhotosTab'
import { uploadShopPhoto, deleteShopPhoto, setPhotoAsCover } from '@/modules/shops/actions/uploadShopPhoto'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PhotosPage({ params }: Props) {
  const { slug } = await params
  // Auth handled by ManageLayout, but re-verified here for defense-in-depth
  await requireShopOwner(slug)

  const shop = await getShopForOwner(slug)
  if (!shop) notFound()

  const uploadAction = uploadShopPhoto.bind(null, slug)
  const deleteAction = deleteShopPhoto.bind(null, slug)
  const setCoverAction = setPhotoAsCover.bind(null, slug)

  return (
    <DashboardLayout
      shopName={shop.name}
      shopSlug={shop.slug}
      shopStatus={shop.status}
      activeTab="photos"
    >
      <PhotosTab
        photos={shop.photos}
        uploadAction={uploadAction}
        deleteAction={deleteAction}
        setCoverAction={setCoverAction}
      />
    </DashboardLayout>
  )
}
