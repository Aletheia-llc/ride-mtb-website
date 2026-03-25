import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/guards'
import { Card } from '@/ui/components'
import { UploadForm } from '@/modules/media'

export const metadata: Metadata = {
  title: 'Upload Media | Ride MTB',
  description: 'Share your trail photos and videos with the community.',
}

export default async function UploadPage() {
  await requireAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/media"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Media
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Upload Media
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Share a photo or video from the trails.
      </p>

      <Card>
        <UploadForm />
      </Card>
    </div>
  )
}
