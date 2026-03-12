import Image from 'next/image'
import Link from 'next/link'
import { Newspaper } from 'lucide-react'
import { fetchMTBNews } from '@/lib/rss/client'

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export async function MTBNewsFeed() {
  const articles = await fetchMTBNews(12)
  if (articles.length === 0) return null

  return (
    <section
      className="border-b border-[var(--color-border)] bg-[var(--color-bg)]"
      aria-label="MTB News"
    >
      <div className="mx-auto px-4 py-3" style={{ maxWidth: 'var(--max-content-width)' }}>
        {/* Section label */}
        <div className="mb-2.5 flex items-center gap-1.5">
          <Newspaper className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            MTB News
          </span>
        </div>

        {/* Horizontal scroll row */}
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {articles.map((article, i) => (
            <Link
              key={`${article.link}-${i}`}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-[200px] shrink-0 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all hover:border-[var(--color-primary)]/40 hover:shadow-sm"
            >
              {/* Thumbnail */}
              <div className="relative h-[108px] w-full overflow-hidden rounded-t-lg bg-[var(--color-border)]">
                {article.imageUrl ? (
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Newspaper className="h-8 w-8 text-[var(--color-border)]" />
                  </div>
                )}
                {/* Source badge overlay */}
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {article.sourceName}
                </span>
              </div>

              {/* Text */}
              <div className="flex flex-1 flex-col gap-1 p-2">
                <p className="line-clamp-3 text-xs font-medium leading-snug text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                  {article.title}
                </p>
                {article.pubDate && (
                  <p className="mt-auto text-[10px] text-[var(--color-text-muted)]">
                    {timeAgo(article.pubDate)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
