import { Newspaper } from 'lucide-react'
import { fetchMTBNews } from '@/lib/rss/client'
import { MTBNewsFeedClient } from './MTBNewsFeedClient'

export async function MTBNewsFeed() {
  const articles = await fetchMTBNews(18)
  if (articles.length === 0) return null

  return (
    <section
      className="border-b border-[var(--color-border)] bg-[var(--color-bg)]"
      aria-label="MTB News"
    >
      <div className="mx-auto px-4 py-3" style={{ maxWidth: 'var(--max-content-width)' }}>
        <div className="mb-2.5 flex items-center gap-1.5">
          <Newspaper className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            MTB News
          </span>
        </div>
        <MTBNewsFeedClient articles={articles} />
      </div>
    </section>
  )
}
