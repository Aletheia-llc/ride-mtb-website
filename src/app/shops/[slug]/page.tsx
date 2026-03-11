import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ShopDetail } from '@/modules/shops'
// eslint-disable-next-line no-restricted-imports
import { getShopBySlug } from '@/modules/shops/lib/queries'

interface ShopPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { slug } = await params
  const shop = await getShopBySlug(slug)

  if (!shop) {
    return { title: 'Shop Not Found | Ride MTB' }
  }

  return {
    title: `${shop.name} | Ride MTB`,
    description: shop.description?.slice(0, 160) ?? `${shop.name} — ${shop.city}, ${shop.state}`,
  }
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { slug } = await params
  const shop = await getShopBySlug(slug)

  if (!shop) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/shops"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shops
      </Link>

      {/* Shop detail */}
      <ShopDetail shop={shop} />
    </div>
  )
}
