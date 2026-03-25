import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import type { MediaItemData, MediaType } from '../types'

// ── getMediaItems ─────────────────────────────────────────

interface MediaFilters {
  mediaType?: MediaType
  trailId?: string
  userId?: string
}

export async function getMediaItems(
  filters?: MediaFilters,
  page: number = 1,
): Promise<{ items: MediaItemData[]; totalCount: number }> {
  const where: Record<string, unknown> = {}

  if (filters?.mediaType) {
    where.mediaType = filters.mediaType
  }
  if (filters?.trailId) {
    where.trailId = filters.trailId
  }
  if (filters?.userId) {
    where.userId = filters.userId
  }

  const [rawItems, totalCount] = await Promise.all([
    db.mediaItem.findMany({
      where,
      ...paginate(page),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, image: true },
        },
      },
    }),
    db.mediaItem.count({ where }),
  ])

  const items: MediaItemData[] = rawItems.map((item) => ({
    id: item.id,
    userId: item.userId,
    mediaType: item.mediaType as MediaType,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    title: item.title,
    description: item.description,
    trailId: item.trailId,
    rideLogId: item.rideLogId,
    width: item.width,
    height: item.height,
    fileSize: item.fileSize,
    createdAt: item.createdAt,
    userName: item.user.name,
    userImage: item.user.image,
  }))

  return { items, totalCount }
}

// ── getMediaItemById ──────────────────────────────────────

export async function getMediaItemById(
  id: string,
): Promise<MediaItemData | null> {
  const item = await db.mediaItem.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  })

  if (!item) return null

  return {
    id: item.id,
    userId: item.userId,
    mediaType: item.mediaType as MediaType,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    title: item.title,
    description: item.description,
    trailId: item.trailId,
    rideLogId: item.rideLogId,
    width: item.width,
    height: item.height,
    fileSize: item.fileSize,
    createdAt: item.createdAt,
    userName: item.user.name,
    userImage: item.user.image,
  }
}

// ── createMediaItem ───────────────────────────────────────

interface CreateMediaItemInput {
  userId: string
  mediaType: MediaType
  url: string
  thumbnailUrl?: string
  title?: string
  description?: string
  trailId?: string
  rideLogId?: string
  width?: number
  height?: number
  fileSize?: number
}

export async function createMediaItem(input: CreateMediaItemInput) {
  return db.mediaItem.create({
    data: {
      userId: input.userId,
      mediaType: input.mediaType,
      url: input.url,
      thumbnailUrl: input.thumbnailUrl ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      trailId: input.trailId ?? null,
      rideLogId: input.rideLogId ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      fileSize: input.fileSize ?? null,
    },
  })
}

// ── deleteMediaItem ───────────────────────────────────────

export async function deleteMediaItem(
  id: string,
  userId: string,
): Promise<boolean> {
  const item = await db.mediaItem.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!item || item.userId !== userId) {
    return false
  }

  await db.mediaItem.delete({ where: { id } })
  return true
}
