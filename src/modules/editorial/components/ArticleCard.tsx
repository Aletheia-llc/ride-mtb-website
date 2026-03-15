import Link from 'next/link'
import Image from 'next/image'
import type { ArticleSummary, ArticleCategory } from '../types'
import { ARTICLE_CATEGORY_LABELS } from '../types'

interface ArticleCardProps {
  article: ArticleSummary
}

export function ArticleCard({ article }: ArticleCardProps) {
  const publishedDate = article.publishedAt
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(article.publishedAt),
      )
    : null

  return (
    <article className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden transition-shadow hover:shadow-md">
      {article.coverImageUrl && (
        <Link href={`/news/${article.slug}`} className="block aspect-video overflow-hidden">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            width={600}
            height={338}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </Link>
      )}
      <div className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
            {ARTICLE_CATEGORY_LABELS[article.category as ArticleCategory]}
          </span>
          {publishedDate && (
            <time
              dateTime={article.publishedAt?.toISOString()}
              className="text-xs text-[var(--color-text-muted)]"
            >
              {publishedDate}
            </time>
          )}
        </div>
        <Link href={`/news/${article.slug}`}>
          <h2 className="mb-2 text-lg font-semibold leading-snug text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
            {article.title}
          </h2>
        </Link>
        {article.excerpt && (
          <p className="text-sm text-[var(--color-text-muted)] line-clamp-3">{article.excerpt}</p>
        )}
        {article.authorName && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">By {article.authorName}</p>
        )}
      </div>
    </article>
  )
}
