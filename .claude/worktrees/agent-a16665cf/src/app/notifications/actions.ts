'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

export async function markAllNotificationsRead(_userId: string) {
  const user = await requireAuth()
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  })
  revalidatePath('/notifications')
}
