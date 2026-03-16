import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { ForumFeed, ForumSortTabs } from '@/modules/forum'
import { Button } from '@/ui/components'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getThreadsByCategory } from '@/modules/forum/lib/queries'

const PAGE_SIZE = 25

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ sort?: string; t?: string; page?: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const result = await getThreadsByCategory(categorySlug, 1)
  if (!result) return { title: 'Category Not Found | Forum | Ride MTB' }

  return {
    title: `${result.category.name} | Forum | Ride MTB`,
    description: `Browse discussions in ${result.category.name} on the Ride MTB community forum.`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { categorySlug } = await params
  const sp = await searchParams
  const sort = (['hot', 'new', 'top'].includes(sp.sort ?? '') ? sp.sort : 'hot') as 'hot' | 'new' | 'top'
  const timePeriod = (['day', 'week', 'month', 'all'].includes(sp.t ?? '') ? sp.t : 'week') as 'day' | 'week' | 'month' | 'all'
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const [result, session] = await Promise.all([
    getThreadsByCategory(categorySlug, page, sort, timePeriod),
    auth(),
  ])

  if (!result) notFound()

  const { category, threads, totalCount } = result
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Build a helper to construct pagination URLs that preserve sort + time params
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (sort !== 'hot') params.set('sort', sort)
    if (sort === 'top' && timePeriod !== 'week') params.set('t', timePeriod)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/forum/${categorySlug}${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/forum"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All categories
      </Link>

      {/* Category header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {category.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalCount} {totalCount === 1 ? 'thread' : 'threads'}
          </p>
        </div>

        {session?.user && (
          <Link href={`/forum/${categorySlug}/new`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Thread
            </Button>
          </Link>
        )}
      </div>

      {/* Thread feed */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <ForumSortTabs />
        <ForumFeed threads={threads} categorySlug={categorySlug} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={pageUrl(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-sm text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={pageUrl(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}
