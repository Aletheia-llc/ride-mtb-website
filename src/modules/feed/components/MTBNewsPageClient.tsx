'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DOMPurify from 'isomorphic-dompurify'
import { X, ExternalLink, Newspaper, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RssItem } from '@/lib/rss/client'

const PAGE_SIZE = 24

const READER_TAGS = ['p','h1','h2','h3','h4','ul','ol','li','blockquote','strong','em','b','i','a','img','figure','figcaption','br','hr','span','div','table','thead','tbody','tr','th','td']
const READER_ATTRS = ['href','src','alt','title','target','rel','width','height']

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
  const hasFullContent = Boolean(article.content)
  // Content is sanitized by DOMPurify — scripts, event handlers, iframes stripped
  const safeContent = hasFullContent
    ? DOMPurify.sanitize(article.content!, { ALLOWED_TAGS: READER_TAGS, ALLOWED_ATTR: READER_ATTRS })
    : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl ${hasFullContent ? 'max-w-2xl' : 'max-w-lg'}`}
        style={{ maxHeight: '90vh' }}
      >
        {article.imageUrl && (
          <div className={`relative w-full shrink-0 bg-[var(--color-border)] ${hasFullContent ? 'h-36' : 'h-52'}`}>
            <Image src={article.imageUrl} alt={article.title} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        <div className="shrink-0 border-b border-[var(--color-border)] px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
              {article.sourceName}
            </span>
            {article.pubDate && (
              <span className="text-xs text-[var(--color-text-muted)]">{timeAgo(article.pubDate)}</span>
            )}
          </div>
          <h2 className="text-base font-bold leading-snug text-[var(--color-text)]">{article.title}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasFullContent ? (
            <div
              className="px-5 py-4 text-sm leading-relaxed text-[var(--color-text)]
                [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold
                [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-bold
                [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold
                [&_p]:mb-3
                [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5
                [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5
                [&_li]:mb-1
                [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--color-text-muted)]
                [&_img]:my-4 [&_img]:w-full [&_img]:rounded-lg [&_img]:object-cover
                [&_a]:text-[var(--color-primary)] [&_a]:underline [&_a]:underline-offset-2
                [&_figure]:my-4
                [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-[var(--color-text-muted)]
                [&_hr]:my-4 [&_hr]:border-[var(--color-border)]"
              ref={(el) => { if (el) el.innerHTML = safeContent }}
            />
          ) : (
            <div className="px-5 py-4">
              {article.description && (
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{article.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3 border-t border-[var(--color-border)] px-5 py-4">
          <Link
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            {hasFullContent ? 'View on' : 'Read on'} {article.sourceName}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
          >
            Close
          </button>
        </div>
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

export function MTBNewsPageClient({ articles, sources }: { articles: RssItem[]; sources: string[] }) {
  const [query, setQuery] = useState('')
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RssItem | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return articles.filter((a) => {
      const matchesSource = !activeSource || a.sourceName === activeSource
      const matchesQuery = !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.sourceName.toLowerCase().includes(q)
      return matchesSource && matchesQuery
    })
  }, [articles, query, activeSource])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(q: string) {
    setQuery(q)
    setPage(1)
  }

  function handleSource(src: string | null) {
    setActiveSource(src)
    setPage(1)
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search articles, gear, trails..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
        <p className="shrink-0 text-xs text-[var(--color-text-muted)]">
          {filtered.length} article{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <button
          onClick={() => handleSource(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !activeSource
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          All
        </button>
        {sources.map((src) => (
          <button
            key={src}
            onClick={() => handleSource(src)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeSource === src
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {src}
          </button>
        ))}
      </div>

      {paginated.length === 0 ? (
        <div className="py-20 text-center text-sm text-[var(--color-text-muted)]">No articles found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {paginated.map((article, i) => (
            <button
              key={`${article.link}-${i}`}
              onClick={() => setSelected(article)}
              className="group flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-left transition-all hover:border-[var(--color-primary)]/40 hover:shadow-sm"
            >
              <div className="relative h-36 w-full overflow-hidden rounded-t-lg bg-[var(--color-border)]">
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
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <p className="line-clamp-3 text-xs font-medium leading-snug text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
                  {article.title}
                </p>
                {article.pubDate && (
                  <p className="mt-auto pt-1 text-[10px] text-[var(--color-text-muted)]">{timeAgo(article.pubDate)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
