import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SLUG_TO_CATEGORY, CATEGORY_SLUGS, BIKE_LISTINGS } from '@/modules/bikes/lib/bike-listings'
import { CATEGORY_META } from '@/modules/bikes/lib/constants'
import { BikeBrowser } from '@/modules/bikes/components/BikeBrowser'
import { CATEGORY_COLORS } from '@/modules/bikes/lib/category-colors'

const CATEGORY_IMAGES: Record<number, string> = {
  1: '/images/categories/photos/category-1.jpg',
  3: '/images/categories/photos/category-3.jpg',
  5: '/images/categories/photos/category-5.jpg',
  7: '/images/categories/photos/category-7.jpg',
  9: '/images/categories/photos/category-9.jpg',
}

interface PageProps {
  params: Promise<{ category: string }>
}

export async function generateStaticParams() {
  return Object.keys(SLUG_TO_CATEGORY).map((category) => ({ category }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params
  const categoryNum = SLUG_TO_CATEGORY[category]
  if (!categoryNum) return { title: 'Browse Bikes | Ride MTB' }
  const meta = CATEGORY_META[categoryNum]
  return {
    title: `${meta.name} Bikes | Ride MTB`,
    description: meta.description,
  }
}

export default async function BrowsePage({ params }: PageProps) {
  const { category } = await params
  const categoryNum = SLUG_TO_CATEGORY[category]
  if (!categoryNum) notFound()

  const meta = CATEGORY_META[categoryNum]
  const bikes = BIKE_LISTINGS.filter((b) => b.category === categoryNum)
  const heroImage = CATEGORY_IMAGES[categoryNum]

  return (
    <div>
      {/* Hero */}
      <div className="relative aspect-[5/1] w-full overflow-hidden">
        {heroImage && (
          <Image
            src={heroImage}
            alt={meta.name}
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.0) 100%)' }}
        />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Browse</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{meta.name}</h1>
          <p className="mt-1 max-w-xl text-sm text-white/80">{meta.description}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="mx-auto max-w-5xl overflow-x-auto px-4">
          <div className="flex gap-1 py-2">
            <Link
              href="/bikes/browse"
              className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              All
            </Link>
            {([1, 3, 5, 7, 9] as const).map((num) => {
              const slug = CATEGORY_SLUGS[num]
              const isActive = num === categoryNum
              const tabNames: Record<number, string> = { 1: 'Gravel', 3: 'XC', 5: 'Trail', 7: 'Enduro', 9: 'Downhill' }
              const colors = CATEGORY_COLORS[num]
              return (
                <Link
                  key={num}
                  href={`/bikes/browse/${slug}`}
                  className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  style={isActive
                    ? { background: colors.tab, color: colors.tabText }
                    : { color: 'var(--color-text-muted)' }
                  }
                >
                  {tabNames[num]}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Browser */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <BikeBrowser bikes={bikes} categoryNum={categoryNum} />
      </div>
    </div>
  )
}
