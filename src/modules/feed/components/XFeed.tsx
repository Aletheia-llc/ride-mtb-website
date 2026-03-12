import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Newspaper } from 'lucide-react'
import { fetchMTBNews } from '@/lib/rss/client'

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export async function XFeed() {
  const articles = await fetchMTBNews(7)

  if (articles.length === 0) return null

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Newspaper className="h-3 w-3" />
          MTB News
        </p>
        <Link
          href="https://www.pinkbike.com/news/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          More <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Articles */}
      <ul className="flex flex-col divide-y divide-[var(--color-border)]">
        {articles.map((article, i) => (
          <li key={`${article.link}-${i}`} className="py-2.5 first:pt-0 last:pb-0">
            <Link
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              {/* Source + time */}
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  {article.sourceName}
                </span>
                {article.pubDate && (
                  <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                    {timeAgo(article.pubDate)}
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                {article.title}
              </p>

              {/* Image (first article only) */}
              {i === 0 && article.imageUrl && (
                <div className="mt-1.5 overflow-hidden rounded-md">
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    width={240}
                    height={120}
                    className="w-full object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Description */}
              {article.description && (
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                  {article.description}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
