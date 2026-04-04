/* eslint-disable no-restricted-imports */
import { getRecentPublishedArticles } from '@/modules/editorial/lib/queries'
import { ArticleCard } from '@/modules/editorial/components/ArticleCard'
import { getUpcomingEvents } from '@/modules/events/lib/queries'
/* eslint-enable no-restricted-imports */
import { RightSidebar } from './RightSidebar'

export async function GuestHomeFeed() {
  const [articlesResult, eventsResult] = await Promise.allSettled([
    getRecentPublishedArticles(12),
    getUpcomingEvents(undefined, 1, 3),
  ])

  const articles = articlesResult.status === 'fulfilled' ? articlesResult.value : []
  const upcomingEvents =
    eventsResult.status === 'fulfilled' ? eventsResult.value.events : []

  return (
    <div className="mx-auto px-4 py-6" style={{ maxWidth: 'var(--max-content-width)' }}>
      <div className="homepage-grid-guest">
        <main>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Latest News
          </h2>
          {articles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No articles yet.</p>
          )}
        </main>
        <RightSidebar upcomingEvents={upcomingEvents} />
      </div>
    </div>
  )
}
