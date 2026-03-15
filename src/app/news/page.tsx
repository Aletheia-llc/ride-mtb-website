import type { Metadata } from 'next'
import Link from 'next/link'
// eslint-disable-next-line no-restricted-imports
import { getPublishedArticles } from '@/modules/editorial/lib/queries'
import { ArticleList, ARTICLE_CATEGORY_LABELS } from '@/modules/editorial'
import type { ArticleCategory } from '@/modules/editorial'

export const metadata: Metadata = {
  title: 'News | Ride MTB',
  description: 'The latest mountain biking news, gear reviews, trail spotlights, and how-to guides from Ride MTB.',
}

interface NewsPageProps {
  searchParams: Promise<{ category?: string; tag?: string; q?: string; page?: string }>
}

const CATEGORIES: ArticleCategory[] = ['news', 'gear_review', 'trail_spotlight', 'how_to', 'culture']

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams
  const category = CATEGORIES.includes(params.category as ArticleCategory)
    ? (params.category as ArticleCategory)
    : undefined
  const tag = params.tag || undefined
  const search = params.q || undefined
  const page = Math.max(1, Number(params.page) || 1)

  const { articles, totalCount } = await getPublishedArticles({ category, tag, search }, page)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">News</h1>
        <p className="text-[var(--color-text-muted)]">
          The latest from the mountain biking world.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <form className="flex-1 min-w-[200px]" method="GET" action="/news">
          {category && <input type="hidden" name="category" value={category} />}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search articles..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </form>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/news${search ? `?q=${search}` : ''}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !category
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/news?category=${cat}${search ? `&q=${search}` : ''}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {ARTICLE_CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        {/* RSS link */}
        <a
          href="/news/feed.xml"
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          title="RSS Feed"
        >
          RSS
        </a>
      </div>

      <ArticleList articles={articles} totalCount={totalCount} page={page} />
    </div>
  )
}
