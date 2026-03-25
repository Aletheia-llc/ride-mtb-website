import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ReviewDetail } from '@/modules/reviews'
// eslint-disable-next-line no-restricted-imports
import { getGearReviewBySlug } from '@/modules/reviews/lib/queries'

interface ReviewPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params
  const review = await getGearReviewBySlug(slug)

  if (!review) {
    return { title: 'Review Not Found | Gear Reviews | Ride MTB' }
  }

  return {
    title: `${review.title} | Gear Reviews | Ride MTB`,
    description: `${review.brand} ${review.productName} review — ${review.content.slice(0, 150)}`,
  }
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params
  const review = await getGearReviewBySlug(slug)

  if (!review) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/reviews"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reviews
      </Link>

      <ReviewDetail review={review} />
    </div>
  )
}
