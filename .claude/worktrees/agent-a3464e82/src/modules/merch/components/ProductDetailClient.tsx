'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button, Badge } from '@/ui/components'
import type { MerchProductDetail } from '../types'

const categoryLabels: Record<string, string> = {
  apparel: 'Apparel',
  headwear: 'Headwear',
  accessories: 'Accessories',
  stickers: 'Stickers',
  drinkware: 'Drinkware',
  other: 'Other',
}

interface ProductDetailClientProps {
  product: MerchProductDetail
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  const hasImages = product.imageUrls.length > 0
  const hasSizes = product.sizes.length > 0

  function handleAddToCart() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image gallery */}
        <div>
          {/* Main image */}
          <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-bg-secondary)]">
            {hasImages ? (
              <Image
                src={product.imageUrls[selectedImage]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                <svg
                  className="h-16 w-16"
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
          </div>

          {/* Thumbnail strip */}
          {product.imageUrls.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.imageUrls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    selectedImage === i
                      ? 'border-[var(--color-primary)]'
                      : 'border-transparent hover:border-[var(--color-border)]'
                  }`}
                >
                  <Image
                    src={url}
                    alt={`${product.name} - image ${i + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          <Badge variant="default" className="mb-3">
            {categoryLabels[product.category] ?? product.category}
          </Badge>

          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {product.name}
          </h1>

          {/* Price */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold text-[var(--color-text)]">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice != null &&
              product.compareAtPrice > product.price && (
                <span className="text-lg text-[var(--color-text-muted)] line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
          </div>

          {/* Stock status */}
          {!product.inStock && (
            <Badge variant="error" className="mt-3">
              Out of Stock
            </Badge>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-6">
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                {product.description}
              </p>
            </div>
          )}

          {/* Size selector */}
          {hasSizes && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-[var(--color-text)]">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                        : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to cart */}
          <div className="mt-8">
            <Button
              size="lg"
              disabled={!product.inStock || (hasSizes && !selectedSize)}
              onClick={handleAddToCart}
              className="w-full"
            >
              {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </Button>
            {hasSizes && !selectedSize && product.inStock && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Please select a size
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3 shadow-lg">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Coming Soon
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            The cart and checkout will be available soon.
          </p>
        </div>
      )}
    </div>
  )
}
