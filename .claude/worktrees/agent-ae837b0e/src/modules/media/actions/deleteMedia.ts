'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { deleteMediaItem } from '../lib/queries'

export async function deleteMedia(mediaId: string): Promise<{ success: boolean }> {
  const user = await requireAuth()

  if (!mediaId) {
    return { success: false }
  }

  const deleted = await deleteMediaItem(mediaId, user.id)

  if (deleted) {
    revalidatePath('/media')
  }

  return { success: deleted }
}
