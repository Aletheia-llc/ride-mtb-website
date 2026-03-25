import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getListingById } from '@/modules/marketplace/lib/queries'
import { CreateListingForm } from '@/modules/marketplace/components/sell/CreateListingForm'
import type { PhotoItem } from '@/modules/marketplace/components/sell/ListingPhotoUploader'

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  const user = await requireAuth()

  const listing = await getListingById(id)

  if (!listing || listing.sellerId !== user.id) {
    notFound()
  }

  const photos: PhotoItem[] = listing.photos.map((p) => ({
    id: p.id,
    url: p.url,
    filename: '',
    isCover: p.isCover,
  }))

  return (
    <CreateListingForm
      initialData={{
        id: listing.id,
        title: listing.title,
        description: listing.description ?? '',
        category: listing.category,
        condition: listing.condition,
        brand: listing.brand ?? undefined,
        modelName: listing.modelName ?? undefined,
        year: listing.year ?? undefined,
        tags: listing.tags ?? [],
        price: Number(listing.price),
        acceptsOffers: listing.acceptsOffers,
        fulfillment: listing.fulfillment,
        shippingCost: listing.shippingCost ? Number(listing.shippingCost) : undefined,
        city: listing.city ?? undefined,
        state: listing.state ?? undefined,
        zipCode: listing.zipCode ?? undefined,
        photos,
        // MTB specs
        frameSize: listing.frameSize ?? undefined,
        wheelSize: listing.wheelSize ?? undefined,
        forkTravel: listing.forkTravel ?? undefined,
        rearTravel: listing.rearTravel ?? undefined,
        frameMaterial: listing.frameMaterial ?? undefined,
        sellerType: listing.sellerType ?? 'individual',
        acceptsTrades: listing.acceptsTrades ?? false,
      }}
    />
  )
}
