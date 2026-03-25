import type { Metadata } from 'next'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopsMapClient } from '@/modules/shops/components/ShopsMapClient'

export const metadata: Metadata = {
  title: 'Shop Map | Ride MTB',
  description: 'Map view of mountain bike shops near you.',
}

export default async function ShopsMapPage() {
  const shops = await db.shop.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      shopType: true,
      partnerTier: true,
      avgOverallRating: true,
      reviewCount: true,
    },
  })

  return (
    <main className="h-[calc(100vh-64px)] flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Shop Map</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{shops.length} shops near you</p>
      </div>
      <div className="flex-1 relative">
        <ShopsMapClient shops={shops} />
      </div>
    </main>
  )
}
