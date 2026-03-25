'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { toggleTrailFavorite } from '../lib/queries'

export async function toggleFavorite(trailId: string): Promise<{ favorited: boolean }> {
  const user = await requireAuth()

  if (!trailId) {
    throw new Error('Trail ID is required')
  }

  const result = await toggleTrailFavorite(trailId, user.id)

  revalidatePath(`/trails/explore/[systemSlug]/[trailSlug]`, 'page')

  return result
}
