import type { Metadata } from 'next'
import Link from 'next/link'
import { ProductGrid } from '@/modules/merch'
import type { MerchCategory } from '@/generated/prisma/client'
// eslint-disable-next-line no-restricted-imports
import { getMerchProducts } from '@/modules/merch/lib/queries'

export const metadata: Metadata = {
  title: 'Merch Store | Ride MTB',
  description:
    'Official Ride MTB merchandise. Apparel, headwear, accessories, stickers, and more.',
}

const categories: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'apparel', label: 'Apparel' },
  { id: 'headwear', label: 'Headwear' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'stickers', label: 'Stickers' },
  { id: 'drinkware', label: 'Drinkware' },
  { id: 'other', label: 'Other' },
]

export default async function MerchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const params = await searchParams
  const activeCategory = params.category ?? 'all'
  const page = parseInt(params.page ?? '1', 10)

  const filters =
    activeCategory !== 'all'
      ? { category: activeCategory as MerchCategory }
      : undefined

  const { products, totalCount } = await getMerchProducts(filters, page)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Merch Store
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Official Ride MTB gear and accessories.
      </p>

      {/* Category filter tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id
          const href =
            cat.id === 'all' ? '/merch' : `/merch?category=${cat.id}`

          return (
            <Link
              key={cat.id}
              href={href}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {cat.label}
            </Link>
          )
        })}
      </div>

      {/* Product grid */}
      <ProductGrid products={products} />

      {/* Pagination info */}
      {totalCount > 25 && (
        <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
          Showing {products.length} of {totalCount} products
        </p>
      )}
    </div>
  )
}
