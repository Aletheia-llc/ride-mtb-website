import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, Plus } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { ReviewList } from '@/modules/reviews'
import { GEAR_CATEGORIES } from '@/modules/reviews'
import type { GearCategory } from '@/modules/reviews'
// eslint-disable-next-line no-restricted-imports
import { getGearReviews } from '@/modules/reviews/lib/queries'

export const metadata: Metadata = {
  title: 'Gear Reviews | Ride MTB',
  description:
    'Read honest gear reviews from real riders. Bikes, helmets, protection, and more.',
}

interface ReviewsPageProps {
  searchParams: Promise<{ category?: string; page?: string }>
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const { category, page } = await searchParams
  const session = await auth()

  const validCategory = GEAR_CATEGORIES.find((c) => c.value === category)
  const filters = validCategory ? { category: validCategory.value as GearCategory } : undefined
  const currentPage = Math.max(1, parseInt(page || '1', 10) || 1)

  const { reviews, totalCount } = await getGearReviews(filters, currentPage)

  const pageSize = 25
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <Star className="h-12 w-12 text-[var(--color-primary)]" />
        </div>
        <h1 className="mb-3 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          Gear Reviews
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--color-text-muted)]">
          Honest reviews from real riders. Find the best gear for your next ride.
        </p>
        {session?.user && (
          <div className="mt-6">
            <Link
              href="/reviews/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              <Plus className="h-5 w-5" />
              Write a Review
            </Link>
          </div>
        )}
      </section>

      {/* Category filter tabs */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
          <Link
            href="/reviews"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !validCategory
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            All
          </Link>
          {GEAR_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/reviews?category=${cat.value}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === cat.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Review list */}
      <ReviewList reviews={reviews} />

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          {currentPage > 1 && (
            <Link
              href={`/reviews?${new URLSearchParams({
                ...(category ? { category } : {}),
                page: String(currentPage - 1),
              })}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-[var(--color-text-muted)]">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/reviews?${new URLSearchParams({
                ...(category ? { category } : {}),
                page: String(currentPage + 1),
              })}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
