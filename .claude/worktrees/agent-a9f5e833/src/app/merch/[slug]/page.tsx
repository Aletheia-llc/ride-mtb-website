import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/modules/merch'
// eslint-disable-next-line no-restricted-imports
import { getMerchProductBySlug } from '@/modules/merch/lib/queries'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getMerchProductBySlug(slug)

  if (!product) {
    return { title: 'Product Not Found | Ride MTB' }
  }

  return {
    title: `${product.name} | Ride MTB Merch`,
    description:
      product.description ??
      `${product.name} — official Ride MTB merchandise. $${product.price.toFixed(2)}`,
  }
}

export default async function MerchProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getMerchProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return <ProductDetail product={product} />
}
