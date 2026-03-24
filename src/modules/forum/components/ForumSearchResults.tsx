'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  FileText,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
} from 'lucide-react'
import { formatRelativeTime } from '@/modules/forum/types'

// ── Types ─────────────────────────────────────────────────────

type ThreadResult = {
  id: string
  title: string
  slug: string
  body: string
  createdAt: Date | string
  viewCount?: number
  _count?: { comments: number }
  category: { name: string; slug: string; color: string | null }
  tags?: Array<{ tag: { name: string; slug: string; color: string } }>
  author: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    avatarUrl: string | null
    role: string | null
  }
}

type ReplyResult = {
  id: string
  body: string
  createdAt: Date | string
  post: { title: string; slug: string }
  author: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    avatarUrl: string | null
  }
}

type UserResult = {
  id: string
  name: string | null
  username: string | null
  image: string | null
  avatarUrl: string | null
  karma: number | null
}

type TabCounts = { threads: number; replies: number; users: number }

interface ForumSearchResultsProps {
  query: string
  type: string
  threadResults: ThreadResult[]
  replyResults: ReplyResult[]
  userResults: UserResult[]
  total: number
  page: number
  tabCounts: TabCounts
}

const PAGE_SIZE = 20

const TABS = [
  { key: 'threads', label: 'Threads', icon: FileText },
  { key: 'replies', label: 'Replies', icon: MessageSquare },
  { key: 'users', label: 'Users', icon: User },
] as const

// ── Component ─────────────────────────────────────────────────

export function ForumSearchResults({
  query,
  type,
  threadResults,
  replyResults,
  userResults,
  total,
  page,
  tabCounts,
}: ForumSearchResultsProps) {
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (!('page' in overrides)) params.delete('page')
    return `/forum/search?${params.toString()}`
  }

  const results = type === 'threads' ? threadResults : type === 'replies' ? replyResults : userResults

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={buildUrl({ type: key, page: '' })}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
              type === key
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="rounded-full bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
              {tabCounts[key]}
            </span>
          </Link>
        ))}
      </div>

      {/* Results */}
      <div className="min-w-0">
        {results.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-16 text-center">
            <p className="text-[var(--color-text-muted)]">No results for &ldquo;{query}&rdquo;</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Try different keywords.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </p>

            <div className="space-y-3">
              {type === 'threads' &&
                (results as ThreadResult[]).map((r) => (
                  <ThreadResultCard key={r.id} result={r} />
                ))}
              {type === 'replies' &&
                (results as ReplyResult[]).map((r) => (
                  <ReplyResultCard key={r.id} result={r} />
                ))}
              {type === 'users' &&
                (results as UserResult[]).map((r) => (
                  <UserResultCard key={r.id} result={r} />
                ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {page > 1 ? (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </span>
                )}

                <span className="px-4 py-2 text-sm text-[var(--color-text-muted)]">
                  Page {page} of {totalPages}
                </span>

                {page < totalPages ? (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm opacity-40">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Result cards ───────────────────────────────────────────────

function ThreadResultCard({ result }: { result: ThreadResult }) {
  const author = result.author
  const bodySnippet = result.body?.slice(0, 200) ?? ''

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:border-[var(--color-text-muted)] hover:shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Link
          href={`/forum/${result.category.slug}`}
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: result.category.color ?? '#6b7280' }}
        >
          {result.category.name}
        </Link>
        {(result.tags ?? []).slice(0, 3).map(({ tag }) => (
          <span
            key={tag.slug}
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${tag.color}38`, color: tag.color, border: `1px solid ${tag.color}60` }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      <h3 className="mb-1 font-semibold text-[var(--color-text)]">
        <Link href={`/forum/thread/${result.slug}`} className="hover:text-[var(--color-primary)]">
          {result.title}
        </Link>
      </h3>

      {bodySnippet && (
        <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">{bodySnippet}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        {author && (
          <span>
            by{' '}
            {author.username ? (
              <Link href={`/forum/user/${author.username}`} className="hover:text-[var(--color-primary)]">
                {author.name ?? author.username}
              </Link>
            ) : (
              (author.name ?? 'Anonymous')
            )}
          </span>
        )}
        <span>{formatRelativeTime(new Date(result.createdAt))}</span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {result._count?.comments ?? 0}
        </span>
      </div>
    </article>
  )
}

function ReplyResultCard({ result }: { result: ReplyResult }) {
  const snippet = result.body.slice(0, 200)

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:border-[var(--color-text-muted)] hover:shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <span>
          {result.author.username ? (
            <Link href={`/forum/user/${result.author.username}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
              {result.author.name ?? result.author.username}
            </Link>
          ) : (
            <span className="font-medium text-[var(--color-text)]">{result.author.name ?? 'Anonymous'}</span>
          )}
        </span>
        <span>replied in</span>
        <Link href={`/forum/thread/${result.post.slug}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
          {result.post.title}
        </Link>
        <span>·</span>
        <span>{formatRelativeTime(new Date(result.createdAt))}</span>
      </div>

      <div className="flex gap-2">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
        <p className="line-clamp-2 text-sm text-[var(--color-text)]">{snippet}</p>
      </div>

      <div className="mt-3">
        <Link
          href={`/forum/thread/${result.post.slug}`}
          className="text-xs text-[var(--color-primary)] hover:underline"
        >
          View thread →
        </Link>
      </div>
    </article>
  )
}

function UserResultCard({ result }: { result: UserResult }) {
  const displayName = result.name ?? result.username ?? 'Anonymous'
  const avatarSrc = result.avatarUrl ?? result.image

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:border-[var(--color-text-muted)] hover:shadow-sm">
      <div className="flex items-center gap-3">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={displayName}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-sm font-medium text-[var(--color-text-muted)]">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {result.username ? (
              <Link
                href={`/forum/user/${result.username}`}
                className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
              >
                {displayName}
              </Link>
            ) : (
              <span className="font-semibold text-[var(--color-text)]">{displayName}</span>
            )}
            {result.username && (
              <span className="text-xs text-[var(--color-text-muted)]">@{result.username}</span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-0.5">
              <ArrowUp className="h-3 w-3" />
              {result.karma ?? 0} karma
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
