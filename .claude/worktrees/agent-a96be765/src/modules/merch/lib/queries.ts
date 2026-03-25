import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import type { MerchCategory } from '@/generated/prisma/client'
import type { MerchProductSummary, MerchProductDetail } from '../types'

// ── Types ─────────────────────────────────────────────────────

export interface MerchProductFilters {
  category?: MerchCategory
  inStock?: boolean
}

// ── 1. getMerchProducts ───────────────────────────────────────

export async function getMerchProducts(
  filters?: MerchProductFilters,
  page: number = 1,
): Promise<{ products: MerchProductSummary[]; totalCount: number }> {
  const where = {
    status: 'published' as const,
    ...(filters?.category && { category: filters.category }),
    ...(filters?.inStock !== undefined && { inStock: filters.inStock }),
  }

  const [rows, totalCount] = await Promise.all([
    db.merchProduct.findMany({
      where,
      ...paginate(page),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        imageUrls: true,
        category: true,
        inStock: true,
      },
    }),
    db.merchProduct.count({ where }),
  ])

  const products: MerchProductSummary[] = rows.map((row) => {
    const urls = row.imageUrls as string[]
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: row.price,
      compareAtPrice: row.compareAtPrice,
      firstImageUrl: urls.length > 0 ? urls[0] : null,
      category: row.category,
      inStock: row.inStock,
    }
  })

  return { products, totalCount }
}

// ── 2. getMerchProductBySlug ──────────────────────────────────

export async function getMerchProductBySlug(
  slug: string,
): Promise<MerchProductDetail | null> {
  const row = await db.merchProduct.findUnique({
    where: { slug, status: 'published' },
  })

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    imageUrls: row.imageUrls as string[],
    category: row.category,
    sizes: row.sizes as string[],
    inStock: row.inStock,
    sortOrder: row.sortOrder,
    stripePriceId: row.stripePriceId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
