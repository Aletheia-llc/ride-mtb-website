import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { ReviewForm } from '@/modules/reviews'

export const metadata: Metadata = {
  title: 'Write a Review | Gear Reviews | Ride MTB',
  description: 'Share your experience with mountain biking gear. Help fellow riders make informed decisions.',
}

export default async function NewReviewPage() {
  await requireAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/reviews"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reviews
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
        Write a Review
      </h1>

      <ReviewForm />
    </div>
  )
}
