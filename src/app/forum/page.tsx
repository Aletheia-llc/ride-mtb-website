import { Suspense } from 'react'
import { getAllPosts } from '@/modules/forum/lib/queries'
import { ForumSidebarNav } from '@/modules/forum/components/ForumSidebarNav'
import { ForumFeed } from '@/modules/forum/components/ForumFeed'
import { ForumSortTabs } from '@/modules/forum/components/ForumSortTabs'
import { ForumPagination } from '@/modules/forum/components/ForumPagination'

interface Props {
  searchParams: Promise<{ sort?: string; page?: string; period?: string }>
}

export default async function ForumPage({ searchParams }: Props) {
  const { sort = 'hot', page = '1', period } = await searchParams
  const sortValue = (['hot', 'new', 'top'].includes(sort) ? sort : 'hot') as 'hot' | 'new' | 'top'
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const { posts, pageCount } = await getAllPosts(sortValue, pageNum, undefined, period)

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6">
      <Suspense>
        <ForumSidebarNav />
      </Suspense>
      <main className="min-w-0 flex-1">
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
