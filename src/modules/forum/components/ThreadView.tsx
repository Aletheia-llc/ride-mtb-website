'use client'

import Link from 'next/link'
import { Eye, MessageSquare, Lock } from 'lucide-react'
import { PostCard } from './PostCard'
import { NestedReplies } from './NestedReplies'
import type { NestedPost } from './NestedReplies'
import type { ForumThread } from '@/modules/forum/types'
import { formatRelativeTime } from '@/modules/forum/types'

interface ThreadViewProps {
  thread: ForumThread
  currentUserId: string | null
  currentUserRole?: string | null
  onVote: (postId: string, value: 1 | -1) => Promise<void>
  renderTrailEmbed?: (threadId: string) => React.ReactNode
}

export function ThreadView({ thread, currentUserId, currentUserRole, onVote, renderTrailEmbed }: ThreadViewProps) {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/forum" className="transition-colors hover:text-[var(--color-text)]">
          Forum
        </Link>
        <span>/</span>
        <Link
          href={`/forum/${thread.category.slug}`}
          className="transition-colors hover:text-[var(--color-text)]"
        >
          {thread.category.name}
        </Link>
      </nav>

      {/* Thread header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{thread.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {thread.viewCount} {thread.viewCount === 1 ? 'view' : 'views'}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {thread.posts.length} {thread.posts.length === 1 ? 'post' : 'posts'}
          </span>
          <time dateTime={new Date(thread.createdAt).toISOString()}>
            {formatRelativeTime(thread.createdAt)}
          </time>
        </div>
      </header>

      {/* Trail embed slot */}
      {renderTrailEmbed && renderTrailEmbed(thread.id)}

      {/* Locked notice */}
      {thread.isLocked && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600/40 dark:bg-yellow-900/20 dark:text-yellow-300">
          <Lock className="h-4 w-4 flex-shrink-0" />
          This thread is locked. No new replies can be posted.
        </div>
      )}

      {/* OP post */}
      {thread.posts.filter(p => p.isFirst).map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onVote={onVote}
        />
      ))}

      {/* Reply posts — nested tree */}
      <NestedReplies
        posts={thread.posts.filter(p => !p.isFirst) as NestedPost[]}
        threadId={thread.id}
        isLocked={thread.isLocked}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole ?? null}
        onVote={onVote}
      />
    </div>
  )
}
