import 'server-only'
import { db } from '@/lib/db/client'

const CREDIT_VALUES: Record<string, number> = {
  forum_post_created: 5,
  forum_thread_created: 10,
  learn_module_completed: 25,
  forum_vote_milestone: 15,
}

export async function grantCredits(userId: string, event: string, description?: string) {
  const amount = CREDIT_VALUES[event]
  if (!amount) return

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { creditEarned: { increment: amount } },
    }),
    db.creditTransaction.create({
      data: {
        userId,
        type: 'EARNED',
        amount,
        description: description ?? `Earned for: ${event.replace(/_/g, ' ')}`,
      },
    }),
  ])
}
