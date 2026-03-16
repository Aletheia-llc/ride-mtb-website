'use client'

import { useState } from 'react'
import { PostCard } from './PostCard'
import type { ForumPost } from '@/modules/forum/types'

// NestedPost is ForumPost with required depth/parentId and typed replies
export type NestedPost = ForumPost & {
  replies?: NestedPost[]
}

interface NestedRepliesProps {
  posts: NestedPost[]
  threadId: string
  isLocked: boolean
  currentUserId: string | null
  currentUserRole: string | null
  onVote: (postId: string, value: 1 | -1) => Promise<void>
}

const BORDER_COLORS = [
  'border-[var(--color-primary)]',
  'border-[var(--color-primary)]/60',
  'border-[var(--color-primary)]/30',
  'border-[var(--color-border)]',
]

function PostWithReplies({
  post,
  threadId,
  isLocked,
  currentUserId,
  currentUserRole,
  onVote,
  depth = 0,
}: {
  post: NestedPost
  threadId: string
  isLocked: boolean
  currentUserId: string | null
  currentUserRole: string | null
  onVote: (postId: string, value: 1 | -1) => Promise<void>
  depth?: number
}) {
  const [showReplies, setShowReplies] = useState(depth < 2)
  const replyCount = post.replies?.length ?? 0

  return (
    <div className={depth > 0 ? `ml-4 border-l-2 pl-4 ${BORDER_COLORS[Math.min(depth, 3)]}` : ''}>
      <PostCard
        post={post}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onVote={onVote}
        showReplyButton={depth < 3 && !isLocked}
        replyParentId={post.id}
        threadId={threadId}
        isLocked={isLocked}
      />

      {replyCount > 0 && depth >= 2 && !showReplies && (
        <button
          onClick={() => setShowReplies(true)}
          className="mb-2 ml-4 text-xs text-[var(--color-primary)] hover:underline"
        >
          Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {(showReplies || depth < 2) && post.replies?.map((reply) => (
        <PostWithReplies
          key={reply.id}
          post={reply}
          threadId={threadId}
          isLocked={isLocked}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onVote={onVote}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export function NestedReplies({
  posts,
  threadId,
  isLocked,
  currentUserId,
  currentUserRole,
  onVote,
}: NestedRepliesProps) {
  if (posts.length === 0) return null

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <PostWithReplies
          key={post.id}
          post={post}
          threadId={threadId}
          isLocked={isLocked}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onVote={onVote}
          depth={0}
        />
      ))}
    </div>
  )
}
