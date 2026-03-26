'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { createNotification } from '@/lib/notifications'

export async function followUser(targetUserId: string) {
  const user = await requireAuth()
  const userId = user.id!

  if (userId === targetUserId) {
    throw new Error('You cannot follow yourself.')
  }

  await db.userFollow.create({
    data: { followerId: userId, followingId: targetUserId },
  })

  const follower = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  })
  const displayName = follower?.name ?? follower?.username ?? 'Someone'

  void createNotification(
    targetUserId,
    'new_follower',
    'New Follower',
    `${displayName} started following you`,
    `/profile/${userId}`,
  )

  revalidatePath(`/profile/${targetUserId}`)
  revalidatePath(`/profile/${userId}`)
}

export async function unfollowUser(targetUserId: string) {
  const user = await requireAuth()
  const userId = user.id!

  await db.userFollow.deleteMany({
    where: { followerId: userId, followingId: targetUserId },
  })

  revalidatePath(`/profile/${targetUserId}`)
  revalidatePath(`/profile/${userId}`)
}

export async function getFollowStatus(targetUserId: string): Promise<boolean> {
  const user = await requireAuth()
  const userId = user.id!

  const follow = await db.userFollow.findUnique({
    where: {
      followerId_followingId: { followerId: userId, followingId: targetUserId },
    },
  })

  return follow !== null
}
