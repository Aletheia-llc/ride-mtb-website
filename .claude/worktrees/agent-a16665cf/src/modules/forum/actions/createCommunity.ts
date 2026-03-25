'use server'

import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/, '')
}

export async function createForumCommunity(formData: FormData) {
  const authUser = await requireAuth()
  const userId = authUser.id

  // Only admin and instructor roles can create communities
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user || !['admin', 'instructor'].includes(user.role)) {
    throw new Error('Only admins and instructors can create communities')
  }

  const name = (formData.get('name') as string).trim()
  const slug = slugify((formData.get('slug') as string | null) || name)
  const description = ((formData.get('description') as string) ?? '').trim() || null
  const color = (formData.get('color') as string) || '#3b82f6'

  if (!name) throw new Error('Name is required')
  if (!slug) throw new Error('Slug is required')

  const existing = await db.forumCategory.findUnique({ where: { slug } })
  if (existing) throw new Error('A category with that slug already exists')

  // Get max sortOrder so community appears at end
  const maxSort = await db.forumCategory.aggregate({ _max: { sortOrder: true } })
  const nextSort = (maxSort._max.sortOrder ?? 0) + 1

  await db.forumCategory.create({
    data: {
      name,
      slug,
      description,
      color,
      sortOrder: nextSort,
      isGated: true,
      ownerId: userId,
      memberCount: 0,
    },
  })

  redirect(`/forum/communities`)
}
