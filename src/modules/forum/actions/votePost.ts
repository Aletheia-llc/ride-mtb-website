'use server'

import { auth } from '@/lib/auth'
import { voteOnContent } from '@/modules/forum/lib/queries'

export async function votePost(
  targetId: string,
  value: 1 | -1,
  targetType: 'post' | 'comment' = 'post',
) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  try {
    const result = await voteOnContent({
      userId: session.user.id,
      ...(targetType === 'post' ? { postId: targetId } : { commentId: targetId }),
      value,
    })
    return { success: true, voteScore: result.voteScore }
  } catch (error) {
    console.error('votePost error:', error)
    return { error: 'Failed to vote' }
  }
}
