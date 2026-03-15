import Link from 'next/link'
import { ArticleCard } from './ArticleCard'
import type { ArticleSummary } from '../types'

interface ArticleListProps {
  articles: ArticleSummary[]
  totalCount: number
  page: number
  basePath?: string
}

const PAGE_SIZE = 25

export function ArticleList({ articles, totalCount, page, basePath = '/news' }: ArticleListProps) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">No articles found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`${basePath}?page=${page - 1}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`${basePath}?page=${page + 1}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
