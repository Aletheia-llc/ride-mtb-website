'use server'

import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { grantXP } from '@/modules/xp'
import { voteOnPost } from '../lib/queries'

export type VotePostResult =
  | { success: true }
  | { success: false; error: string }

export async function votePost(
  postId: string,
  value: 1 | -1,
): Promise<VotePostResult> {
  try {
    const user = await requireAuth()

    if (typeof postId !== 'string' || !postId) {
      return { success: false, error: 'Invalid post ID' }
    }

    if (value !== 1 && value !== -1) {
      return { success: false, error: 'Invalid vote value' }
    }

    await rateLimit({ userId: user.id, action: 'forum-vote', maxPerMinute: 30 })

    await voteOnPost({ postId, userId: user.id, value })

    await grantXP({
      userId: user.id,
      event: 'forum_vote_received',
      module: 'forum',
      refId: `${postId}-${user.id}`,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { success: false, error: error.message }
    }
    if (error instanceof Error && error.message.includes('Post not found')) {
      return { success: false, error: 'Post not found' }
    }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
