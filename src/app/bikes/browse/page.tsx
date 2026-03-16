import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORY_SLUGS } from '@/modules/bikes/lib/bike-listings'
import { BikeBrowser } from '@/modules/bikes/components/BikeBrowser'
import { CATEGORY_COLORS } from '@/modules/bikes/lib/category-colors'
import { getBikeListings } from '@/modules/bikes/lib/queries'

export const metadata: Metadata = {
  title: 'Browse All Bikes | Ride MTB',
  description: 'Browse all mountain bikes across every category — from gravel to downhill.',
}

const TAB_NAMES: Record<number, string> = { 1: 'Gravel', 3: 'XC', 5: 'Trail', 7: 'Enduro', 9: 'Downhill' }

export default async function BrowseAllPage() {
  const bikes = await getBikeListings()

  return (
    <div>
      {/* Hero */}
      <div className="bg-[var(--color-bg-secondary)] px-6 py-12 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Browse</p>
        <h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">All Mountain Bikes</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--color-text-muted)]">
          {bikes.length} bikes across 5 categories — filter by brand, budget, and frame material.
        </p>
      </div>

      {/* Category tabs */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="mx-auto max-w-5xl overflow-x-auto px-4">
          <div className="flex gap-1 py-2">
            <Link
              href="/bikes/browse"
              className="whitespace-nowrap rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              All
            </Link>
            {([1, 3, 5, 7, 9] as const).map((num) => (
              <Link
                key={num}
                href={`/bikes/browse/${CATEGORY_SLUGS[num]}`}
                className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
                style={{ background: CATEGORY_COLORS[num].bg, color: CATEGORY_COLORS[num].text }}
              >
                {TAB_NAMES[num]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Browser — all bikes, no category filter */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <BikeBrowser bikes={bikes} />
      </div>
    </div>
  )
}
