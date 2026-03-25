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

export async function getCreatorVideos(creatorProfileId: string) {
  return db.creatorVideo.findMany({
    where: { creatorId: creatorProfileId },
    include: {
      tags: true,
      _count: { select: { impressions: { where: { status: 'confirmed' } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}
