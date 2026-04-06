/* eslint-disable no-restricted-imports */
import Link from 'next/link'
import { MapPin, MessageSquare, BookOpen } from 'lucide-react'
import { getRecentPublishedArticles } from '@/modules/editorial/lib/queries'
import { ArticleCard } from '@/modules/editorial/components/ArticleCard'
import { getUpcomingEvents } from '@/modules/events/lib/queries'
import { db } from '@/lib/db/client'
/* eslint-enable no-restricted-imports */
import { RightSidebar } from './RightSidebar'

async function getFeaturedTrailSystems() {
  return db.trailSystem.findMany({
    where: { status: 'open' },
    orderBy: { trailCount: 'desc' },
    take: 6,
    select: { name: true, slug: true, city: true, state: true, trailCount: true, totalMiles: true },
  }).catch(() => [])
}

async function getPopularThreads() {
  return db.post.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, slug: true, _count: { select: { comments: true } }, category: { select: { name: true } } },
  }).catch(() => [])
}

export async function GuestHomeFeed() {
  const [articlesResult, eventsResult, trailSystems, threads] = await Promise.allSettled([
    getRecentPublishedArticles(8),
    getUpcomingEvents(undefined, 1, 3),
    getFeaturedTrailSystems(),
    getPopularThreads(),
  ])

  const articles = articlesResult.status === 'fulfilled' ? articlesResult.value : []
  const upcomingEvents = eventsResult.status === 'fulfilled' ? eventsResult.value.events : []
  const systems = trailSystems.status === 'fulfilled' ? trailSystems.value : []
  const forumThreads = threads.status === 'fulfilled' ? threads.value : []

  return (
    <div className="mx-auto px-4 py-6" style={{ maxWidth: 'var(--max-content-width)' }}>
      <div className="homepage-grid-guest">
        <main className="space-y-10">
          {/* Featured trail systems */}
          {systems.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  <MapPin className="mr-1.5 inline h-4 w-4" />
                  Popular Trail Systems
                </h2>
                <Link href="/trails/explore" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                  Explore all trails →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {systems.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/trails/explore/${s.slug}`}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30 hover:shadow-md"
                  >
                    <p className="font-semibold text-sm text-[var(--color-text)]">{s.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {[s.city, s.state].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {s.trailCount} trails{s.totalMiles > 0 ? ` · ${s.totalMiles.toFixed(0)} mi` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Latest news */}
          <section>
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
          </section>

          {/* Forum preview */}
          {forumThreads.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  <MessageSquare className="mr-1.5 inline h-4 w-4" />
                  Community Discussions
                </h2>
                <Link href="/forum" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                  Browse forum →
                </Link>
              </div>
              <div className="space-y-2">
                {forumThreads.map((t) => (
                  <Link
                    key={t.id}
                    href={`/forum/thread/${t.slug}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{t.title}</p>
                      {t.category && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.category.name}</p>
                      )}
                    </div>
                    <span className="ml-3 shrink-0 text-xs text-[var(--color-text-muted)]">
                      {t._count.comments} replies
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
                <Link href="/signin" className="text-[var(--color-primary)] hover:underline">Join free</Link> to participate in discussions
              </p>
            </section>
          )}
        </main>
        <RightSidebar upcomingEvents={upcomingEvents} />
      </div>
    </div>
  )
}
