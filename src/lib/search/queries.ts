import 'server-only'
import { db } from '@/lib/db/client'

const RESULT_LIMIT = 10

// ── Forum threads ────────────────────────────────────────────────────────────

export async function searchThreads(query: string) {
  return db.post.findMany({
    where: {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: RESULT_LIMIT,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      body: true,
      createdAt: true,
      author: { select: { username: true, name: true } },
      category: { select: { name: true, slug: true } },
      _count: { select: { comments: true } },
    },
  })
}

// ── Marketplace listings ─────────────────────────────────────────────────────

export async function searchListings(query: string) {
  return db.listing.findMany({
    where: {
      status: 'active',
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { modelName: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: RESULT_LIMIT,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      category: true,
      condition: true,
      location: true,
      createdAt: true,
      photos: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { url: true },
      },
      seller: {
        select: { name: true, username: true },
      },
    },
  })
}

// ── Members ──────────────────────────────────────────────────────────────────

export async function searchMembers(query: string) {
  return db.user.findMany({
    where: {
      bannedAt: null,
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: RESULT_LIMIT,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      role: true,
      bio: true,
    },
  })
}

// ── Combined counts ──────────────────────────────────────────────────────────

export async function getGlobalSearchCounts(query: string) {
  const [threads, listings, members] = await Promise.all([
    db.post.count({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
    db.listing.count({
      where: {
        status: 'active',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { modelName: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
    db.user.count({
      where: {
        bannedAt: null,
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
  ])
  return { threads, listings, members }
}
