import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAllPosts, getCategories } from '@/modules/forum/lib/queries'
import { ForumSidebarNav } from '@/modules/forum/components/ForumSidebarNav'
import { ForumFeed } from '@/modules/forum/components/ForumFeed'
import { ForumSortTabs } from '@/modules/forum/components/ForumSortTabs'
import { ForumPagination } from '@/modules/forum/components/ForumPagination'

interface Props {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ sort?: string; page?: string; period?: string }>
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const { sort = 'hot', page = '1', period } = await searchParams
  const sortValue = (['hot', 'new', 'top'].includes(sort) ? sort : 'hot') as 'hot' | 'new' | 'top'
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const [{ posts, pageCount }, categories] = await Promise.all([
    getAllPosts(sortValue, pageNum, categorySlug, period),
    getCategories(),
  ])

  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) notFound()

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6">
      <Suspense>
        <ForumSidebarNav activeSlug={categorySlug} />
      </Suspense>
      <main className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h1 className="text-xl font-semibold">{category.name}</h1>
          {category.description && (
            <p className="ml-2 text-sm text-[var(--color-text-muted)]">{category.description}</p>
          )}
        </div>
        <ForumSortTabs />
        <ForumFeed posts={posts} />
        {pageCount > 1 && (
          <Suspense>
            <ForumPagination currentPage={pageNum} pageCount={pageCount} />
          </Suspense>
        )}
      </main>
    </div>
  )
}
