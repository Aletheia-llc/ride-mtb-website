'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

export async function joinForumCommunity(categoryId: string) {
  const user = await requireAuth()
  const userId = user.id

  const category = await db.forumCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, isGated: true, slug: true },
  })

  if (!category) throw new Error('Community not found')
  if (!category.isGated) throw new Error('This is not a gated community')

  await db.forumCommunityMembership.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    create: { userId, categoryId },
    update: {},
  })

  // Recalculate from source of truth to prevent drift on duplicate joins
  void db.forumCommunityMembership.count({ where: { categoryId } }).then((count) =>
    db.forumCategory.update({ where: { id: categoryId }, data: { memberCount: count } })
  ).catch(() => {})

  revalidatePath(`/forum/${category.slug}`)
  revalidatePath('/forum/communities')
  return { joined: true }
}

export async function leaveForumCommunity(categoryId: string) {
  const user = await requireAuth()
  const userId = user.id

  const category = await db.forumCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, slug: true, memberCount: true },
  })

  if (!category) throw new Error('Community not found')

  await db.forumCommunityMembership.deleteMany({
    where: { userId, categoryId },
  })

  // Recalculate from source of truth to prevent drift on double-leave
  void db.forumCommunityMembership.count({ where: { categoryId } }).then((count) =>
    db.forumCategory.update({ where: { id: categoryId }, data: { memberCount: count } })
  ).catch(() => {})

  revalidatePath(`/forum/${category.slug}`)
  revalidatePath('/forum/communities')
  return { joined: false }
}
