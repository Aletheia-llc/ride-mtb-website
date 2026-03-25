import type { MerchProductDetail } from '../types'
import { ProductDetailClient } from './ProductDetailClient'

interface ProductDetailProps {
  product: MerchProductDetail
}

export function ProductDetail({ product }: ProductDetailProps) {
  return <ProductDetailClient product={product} />
}
