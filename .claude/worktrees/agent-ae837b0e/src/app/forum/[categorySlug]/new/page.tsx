import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { NewThreadForm } from '@/modules/forum'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { getThreadsByCategory } from '@/modules/forum/lib/queries'

export const metadata: Metadata = {
  title: 'New Thread | Forum | Ride MTB',
  description: 'Start a new discussion thread in the Ride MTB community forum.',
}

interface NewThreadPageProps {
  params: Promise<{ categorySlug: string }>
}

export default async function NewThreadPage({ params }: NewThreadPageProps) {
  await requireAuth()

  const { categorySlug } = await params
  const result = await getThreadsByCategory(categorySlug, 1)

  if (!result) notFound()

  const { category } = result

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`/forum/${categorySlug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {category.name}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
        New Thread
      </h1>

      <NewThreadForm categoryId={category.id} categorySlug={categorySlug} />
    </div>
  )
}
