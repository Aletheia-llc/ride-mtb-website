import { ShoppingBag } from 'lucide-react'
import { EmptyState } from '@/ui/components'
import { ProductCard } from './ProductCard'
import type { MerchProductSummary } from '../types'

interface ProductGridProps {
  products: MerchProductSummary[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-12 w-12" />}
        title="No products found"
        description="Check back soon — new merch is on the way."
      />
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
