import type { Metadata } from 'next'
import { fetchMTBNews } from '@/lib/rss/client'
import { MTBNewsPageClient } from '@/modules/feed/components/MTBNewsPageClient'

export const metadata: Metadata = {
  title: 'MTB News | Ride MTB',
  description: 'The latest mountain biking news from around the world.',
}

export const revalidate = 600 // 10-min cache

export default async function MTBNewsPage() {
  const articles = await fetchMTBNews(140)
  const sources = [...new Set(articles.map((a) => a.sourceName))].sort()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-1 text-3xl font-bold text-[var(--color-text)]">MTB News</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          The latest from {sources.length} sources around the mountain biking world.
        </p>
      </div>
      <MTBNewsPageClient articles={articles} sources={sources} />
    </div>
  )
}
