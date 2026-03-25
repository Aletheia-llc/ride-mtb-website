import 'server-only'
import { db } from '@/lib/db/client'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  linkUrl?: string,
) {
  return db.notification.create({
    data: { userId, type, title, message, linkUrl: linkUrl ?? null },
  })
}
