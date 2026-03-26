import 'server-only'
import { db } from '@/lib/db/client'
import { authorDetailSelect } from './_selects'

export async function getCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      color: true,
      sortOrder: true,
      _count: { select: { posts: { where: { deletedAt: null } } } },
    },
  })
}

export async function getForumStats() {
  const [threadCount, postCount, userCount] = await Promise.all([
    db.post.count({ where: { deletedAt: null } }),
    db.comment.count({ where: { deletedAt: null } }),
    db.user.count(),
  ])
  return { threadCount, postCount, userCount }
}

export async function getOnlineUserCount() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000)
  return db.user.count({ where: { lastActivityAt: { gte: fiveMinutesAgo } } })
}

export async function getForumUserProfile(username: string) {
  return db.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      role: true,
      karma: true,
      bio: true,
      createdAt: true,
      isPremium: true,
      isVerifiedCreator: true,
      _count: {
        select: {
          posts: { where: { deletedAt: null } },
          trailReviews: true,
          rideLogs: true,
          gearReviews: true,
        },
      },
      xpAggregate: {
        select: { totalXp: true, moduleBreakdown: true, streakDays: true },
      },
      userBadges: {
        include: {
          badge: { select: { name: true, description: true, icon: true, color: true } },
        },
      },
    },
  })
}

export async function getTopForumMembers(limit = 5) {
  const users = await db.user.findMany({
    orderBy: { karma: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      karma: true,
      _count: { select: { posts: { where: { deletedAt: null } } } },
    },
  })
  return users.map((u, i) => ({
    rank: i + 1,
    user: {
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      avatarUrl: u.avatarUrl,
      karma: u.karma,
    },
    postCount: u._count.posts,
  }))
}

export async function getPopularTags(limit = 10) {
  return db.tag.findMany({
    take: limit,
    orderBy: { posts: { _count: 'desc' } },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      _count: { select: { posts: true } },
    },
  })
}

export async function getForumLeaderboard(limit = 50) {
  const users = await db.user.findMany({
    orderBy: { karma: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      karma: true,
      _count: { select: { posts: { where: { deletedAt: null } } } },
    },
  })
  return users.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.name,
    username: u.username,
    image: u.image,
    avatarUrl: u.avatarUrl,
    karma: u.karma ?? 0,
    postCount: u._count.posts,
  }))
}

export async function getForumCommunities(opts?: { q?: string; sort?: 'popular' | 'newest' }) {
  const { q, sort = 'popular' } = opts ?? {}
  const where = {
    isGated: true,
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  }
  return db.category.findMany({
    where,
    orderBy: sort === 'newest' ? { id: 'desc' } : { memberCount: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      color: true,
      coverImageUrl: true,
      memberCount: true,
      owner: { select: { id: true, username: true } },
    },
  })
}

export async function getUserForumMemberships(userId: string): Promise<Set<string>> {
  const memberships = await db.communityMembership.findMany({
    where: { userId },
    select: { categoryId: true },
  })
  return new Set(memberships.map((m) => m.categoryId))
}

export async function searchUsers(query: string) {
  return db.user.findMany({
    where: {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 10,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      role: true,
      karma: true,
    },
  })
}

export async function getForumSearchCounts(query: string) {
  const [posts, comments, users] = await Promise.all([
    db.post.count({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
    db.comment.count({
      where: { deletedAt: null, body: { contains: query, mode: 'insensitive' } },
    }),
    db.user.count({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
  ])
  return { posts, comments, users }
}
