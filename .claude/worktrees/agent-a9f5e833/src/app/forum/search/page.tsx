import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Search } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import {
  searchForumThreads,
  searchForumReplies,
  searchForumUsers,
  getForumSearchCounts,
  getCategories,
} from '@/modules/forum/lib/queries'
// eslint-disable-next-line no-restricted-imports
import { ForumSearchResults } from '@/modules/forum/components/ForumSearchResults'

export const metadata: Metadata = {
  title: 'Search | Ride MTB Forum',
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    category?: string
    author?: string
    dateFrom?: string
    dateTo?: string
    sort?: string
    page?: string
  }>
}

export default async function ForumSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const type = ['threads', 'replies', 'users'].includes(params.type ?? '') ? (params.type ?? 'threads') : 'threads'
  const category = params.category ?? ''
  const author = params.author ?? ''
  const dateFrom = params.dateFrom ?? ''
  const dateTo = params.dateTo ?? ''
  const sort = (params.sort === 'votes' ? 'votes' : 'date') as 'date' | 'votes'
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  if (!query) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 flex items-center gap-2 text-2xl font-bold text-[var(--color-text)]">
          <Search className="h-6 w-6" />
          Search Forum
        </h1>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-24 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Search the forum</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Use the search bar in the forum sidebar to find threads, replies, and members.
          </p>
        </div>
      </div>
    )
  }

  const [categories, tabCounts] = await Promise.all([
    getCategories(),
    getForumSearchCounts(query, {
      categorySlug: category || undefined,
      authorUsername: author || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  ])

  // Fetch results for the active tab
  let threadResults: Awaited<ReturnType<typeof searchForumThreads>>['threads'] = []
  let replyResults: Awaited<ReturnType<typeof searchForumReplies>>['posts'] = []
  let userResults: Awaited<ReturnType<typeof searchForumUsers>>['users'] = []
  let total = 0

  if (type === 'threads') {
    const data = await searchForumThreads(query, {
      categorySlug: category || undefined,
      authorUsername: author || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sort,
      page,
    })
    threadResults = data.threads
    total = data.totalCount
  } else if (type === 'replies') {
    const data = await searchForumReplies(query, {
      authorUsername: author || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
    })
    replyResults = data.posts
    total = data.totalCount
  } else {
    const data = await searchForumUsers(query, { page })
    userResults = data.users
    total = data.totalCount
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">
        <Search className="h-5 w-5" />
        Results for <span className="text-[var(--color-primary)]">&ldquo;{query}&rdquo;</span>
      </h1>

      <Suspense>
        <ForumSearchResults
          query={query}
          type={type}
          threadResults={threadResults}
          replyResults={replyResults}
          userResults={userResults}
          total={total}
          page={page}
          tabCounts={{
            threads: tabCounts.threadCount,
            replies: tabCounts.replyCount,
            users: tabCounts.userCount,
          }}
          categories={categories.map((c) => ({
            name: c.name,
            slug: c.slug,
            color: (c as { color?: string | null }).color ?? null,
          }))}
          filters={{ category, author, dateFrom, dateTo, sort }}
        />
      </Suspense>
    </div>
  )
}
