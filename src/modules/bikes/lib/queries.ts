import { db } from '@/lib/db/client'
import type { BikeListing } from './bike-listings'

function mapRow(row: {
  id: string; brand: string; model: string; category: number; price: number;
  travel: number | null; wheelSize: string; frame: string; description: string; affiliateUrl: string
}): BikeListing {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    category: row.category,
    price: row.price,
    travel: row.travel,
    wheelSize: row.wheelSize as BikeListing['wheelSize'],
    frame: row.frame as BikeListing['frame'],
    description: row.description,
    affiliateUrl: row.affiliateUrl,
  }
}

export async function getBikeListings(categoryNum?: number): Promise<BikeListing[]> {
  const rows = await db.bikeListing.findMany({
    where: { active: true, ...(categoryNum ? { category: categoryNum } : {}) },
    orderBy: [{ category: 'asc' }, { price: 'asc' }],
  })
  return rows.map(mapRow)
}
