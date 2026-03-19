import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { CreateListingForm } from '@/modules/marketplace/components/sell/CreateListingForm'
import type { ListingCategory } from '@/modules/marketplace/types'

interface SellPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SellPage({ searchParams }: SellPageProps) {
  const sp = await searchParams
  const user = await requireAuth()

  let initialData: { title: string; category: ListingCategory } | undefined = undefined

  const fromBike = typeof sp.fromBike === 'string' ? sp.fromBike : undefined
  if (fromBike) {
    const bike = await db.userBike.findUnique({
      where: { id: fromBike, userId: user.id },
    })
    if (bike) {
      initialData = {
        title: `${bike.year ?? ''} ${bike.brand} ${bike.model}`.trim(),
        category: 'complete_bike' as ListingCategory,
      }
    }
  }

  return <CreateListingForm initialData={initialData} />
}
