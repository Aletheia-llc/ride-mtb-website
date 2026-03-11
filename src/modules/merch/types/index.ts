// ── Merch module types ────────────────────────────────────────
// Aligned with query return shapes from lib/queries.ts

import type { MerchCategory as PrismaMerchCategory } from '@/generated/prisma/client'

export type MerchCategory = `${PrismaMerchCategory}`

export interface MerchProductSummary {
  id: string
  name: string
  slug: string
  price: number
  compareAtPrice: number | null
  firstImageUrl: string | null
  category: MerchCategory
  inStock: boolean
}

export interface MerchProductDetail {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  compareAtPrice: number | null
  imageUrls: string[]
  category: MerchCategory
  sizes: string[]
  inStock: boolean
  sortOrder: number
  stripePriceId: string | null
  createdAt: Date
  updatedAt: Date
}
