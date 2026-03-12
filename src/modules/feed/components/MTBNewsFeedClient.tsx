'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ExternalLink, Newspaper } from 'lucide-react'
import type { RssItem } from '@/lib/rss/client'

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

function ArticleModal({ article, onClose }: { article: RssItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
        {/* Image */}
        {article.imageUrl && (
          <div className="relative h-52 w-full bg-[var(--color-border)]">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Source + time */}
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
              {article.sourceName}
            </span>
            {article.pubDate && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {timeAgo(article.pubDate)}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="mb-3 text-base font-bold leading-snug text-[var(--color-text)]">
            {article.title}
          </h2>

          {/* Description */}
          {article.description && (
            <p className="mb-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {article.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              Read on {article.sourceName}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
            >
              Close
            </button>
          </div>
        </div>

        {/* Close icon */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function MTBNewsFeedClient({ articles }: { articles: RssItem[] }) {
  const [selected, setSelected] = useState<RssItem | null>(null)

  return (
    <>
      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {articles.map((article, i) => (
          <button
            key={`${article.link}-${i}`}
            onClick={() => setSelected(article)}
            className="group flex w-[200px] shrink-0 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-left transition-all hover:border-[var(--color-primary)]/40 hover:shadow-sm"
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
          </button>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <ArticleModal article={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
