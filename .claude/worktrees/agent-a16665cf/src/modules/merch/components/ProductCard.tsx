import Image from 'next/image'
import Link from 'next/link'
import { Card, Badge } from '@/ui/components'
import type { MerchProductSummary } from '../types'

const categoryLabels: Record<string, string> = {
  apparel: 'Apparel',
  headwear: 'Headwear',
  accessories: 'Accessories',
  stickers: 'Stickers',
  drinkware: 'Drinkware',
  other: 'Other',
}

interface ProductCardProps {
  product: MerchProductSummary
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/merch/${product.slug}`} className="group block">
      <Card className="overflow-hidden p-0 transition-shadow group-hover:shadow-md">
        {/* Image */}
        <div className="relative aspect-square bg-[var(--color-bg-secondary)]">
          {product.firstImageUrl ? (
            <Image
              src={product.firstImageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
            </div>
          )}

          {/* Out of stock overlay */}
          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Badge variant="error">Out of Stock</Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <Badge variant="default" className="mb-2">
            {categoryLabels[product.category] ?? product.category}
          </Badge>

          <h3 className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
            {product.name}
          </h3>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--color-text)]">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice != null &&
              product.compareAtPrice > product.price && (
                <span className="text-xs text-[var(--color-text-muted)] line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
