'use client'

import { ThreadView, ReplyForm } from '@/modules/forum'
// eslint-disable-next-line no-restricted-imports
import { votePost } from '@/modules/forum/actions/votePost'
import type { ForumThread } from '@/modules/forum'

interface ThreadPageClientProps {
  thread: ForumThread
  currentUserId: string | null
  currentUserRole?: string | null
}

export function ThreadPageClient({ thread, currentUserId, currentUserRole }: ThreadPageClientProps) {
  async function handleVote(postId: string, value: 1 | -1) {
    await votePost(postId, value)
  }

  return (
    <>
      <ThreadView
        thread={thread}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onVote={handleVote}
      />
      <div className="mt-8">
        <ReplyForm threadId={thread.id} isLocked={thread.isLocked} />
      </div>
    </>
  )
}
