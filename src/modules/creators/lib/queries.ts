import 'server-only'
import { db } from '@/lib/db/client'

export async function getCreators() {
  return db.creatorProfile.findMany({
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
      _count: { select: { videos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCreatorByUserId(userId: string) {
  return db.creatorProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
      _count: { select: { videos: true } },
    },
  })
}
