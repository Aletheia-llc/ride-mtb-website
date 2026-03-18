import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db/client'

const PAGE_SIZE = 20

// ── Shared select shapes ───────────────────────────────────────────────────

const authorSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  avatarUrl: true,
  role: true,
  karma: true,
} satisfies Prisma.UserSelect

const authorDetailSelect = {
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
  _count: { select: { posts: { where: { deletedAt: null } } } },
  userBadges: {
    include: {
      badge: { select: { name: true, description: true, icon: true, color: true } },
    },
  },
} satisfies Prisma.UserSelect

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  color: true,
  icon: true,
} satisfies Prisma.CategorySelect

const tagInclude = {
  tag: { select: { id: true, name: true, slug: true, color: true } },
} satisfies Prisma.PostTagInclude

// ── Time period helper ─────────────────────────────────────────────────────

function getTimePeriodStart(period: string): Date {
  const now = new Date()
  const ms: Record<string, number> = {
    day: 86_400_000,
    week: 7 * 86_400_000,
    month: 30 * 86_400_000,
    year: 365 * 86_400_000,
  }
  return ms[period] ? new Date(now.getTime() - ms[period]) : new Date(0)
}

// ── Read: Feed ─────────────────────────────────────────────────────────────

export async function getAllPosts(
  sort: 'hot' | 'new' | 'top' = 'hot',
  page = 1,
  categorySlug?: string,
  timePeriod?: string,
) {
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.PostWhereInput = {
    deletedAt: null,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(sort === 'top' && timePeriod && timePeriod !== 'all'
      ? { createdAt: { gte: getTimePeriodStart(timePeriod) } }
      : {}),
  }

  const orderBy: Prisma.PostOrderByWithRelationInput =
    sort === 'new' ? { createdAt: 'desc' }
    : sort === 'top' ? { viewCount: 'desc' }
    : { hotScore: 'desc' }

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
        tags: { include: tagInclude },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    }),
    db.post.count({ where }),
  ])

  return { posts, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ── Read: Single post ──────────────────────────────────────────────────────

export async function getPostBySlug(slug: string) {
  return db.post.findUnique({
    where: { slug, deletedAt: null },
    include: {
      author: { select: authorDetailSelect },
      category: { select: categorySelect },
      tags: { include: tagInclude },
      linkPreview: true,
      _count: { select: { comments: { where: { deletedAt: null } } } },
    },
  })
}

// ── Read: Comments ─────────────────────────────────────────────────────────

export async function getComments(
  postId: string,
  sort: 'oldest' | 'newest' | 'best' = 'oldest',
  page = 1,
) {
  const skip = (page - 1) * PAGE_SIZE
  const where: Prisma.CommentWhereInput = { postId, deletedAt: null }

  const orderBy: Prisma.CommentOrderByWithRelationInput | Prisma.CommentOrderByWithRelationInput[] =
    sort === 'newest' ? { createdAt: 'desc' }
    : sort === 'best' ? [{ voteScore: 'desc' }, { createdAt: 'asc' }]
    : { createdAt: 'asc' }

  const [comments, total] = await Promise.all([
    db.comment.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: { author: { select: authorDetailSelect } },
    }),
    db.comment.count({ where }),
  ])

  return { comments, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ── Read: Categories ───────────────────────────────────────────────────────

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

// ── Read: Stats ────────────────────────────────────────────────────────────

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

// ── Read: Bookmarks ────────────────────────────────────────────────────────

export async function getBookmarkedPosts(userId: string) {
  const bookmarks = await db.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          author: { select: authorSelect },
          category: { select: categorySelect },
          tags: { include: tagInclude },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      },
    },
  })
  return bookmarks.map((b) => b.post)
}

// ── Read: User profile ─────────────────────────────────────────────────────

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
      _count: { select: { posts: { where: { deletedAt: null } } } },
      userBadges: {
        include: {
          badge: { select: { name: true, description: true, icon: true, color: true } },
        },
      },
    },
  })
}

export async function getUserPosts(username: string, page = 1) {
  const skip = (page - 1) * PAGE_SIZE
  const where: Prisma.PostWhereInput = { deletedAt: null, author: { username } }

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        author: { select: authorSelect },
        category: { select: categorySelect },
        tags: { include: tagInclude },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    }),
    db.post.count({ where }),
  ])

  return { posts, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

// ── Read: Search ───────────────────────────────────────────────────────────

export async function searchPosts(query: string) {
  return db.post.findMany({
    where: {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: authorSelect },
      category: { select: categorySelect },
    },
  })
}

export async function searchComments(query: string) {
  return db.comment.findMany({
    where: {
      deletedAt: null,
      body: { contains: query, mode: 'insensitive' },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: authorSelect },
      post: { select: { id: true, title: true, slug: true } },
    },
  })
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

// ── Read: Sidebar helpers ──────────────────────────────────────────────────

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
    user: { id: u.id, name: u.name, username: u.username, image: u.image, avatarUrl: u.avatarUrl, karma: u.karma },
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

export async function getLatestForumThreads(limit = 5) {
  return db.post.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      author: { select: { name: true, username: true } },
    },
  })
}

// ── Read: Leaderboard ─────────────────────────────────────────────────────

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

// ── Read: Communities ─────────────────────────────────────────────────────

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

// ── Read: By category ─────────────────────────────────────────────────────

export async function getThreadsByCategory(
  categorySlug: string,
  page = 1,
  sort: 'hot' | 'new' | 'top' = 'hot',
  timePeriod?: string,
) {
  const category = await db.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true, name: true, slug: true, color: true, icon: true, description: true },
  })
  if (!category) return null

  const { posts, total, pageCount } = await getAllPosts(sort, page, categorySlug, timePeriod)
  return { category, posts, total, pageCount }
}

// ── Write helpers (called by server actions) ───────────────────────────────

export async function createPostRecord(data: {
  categoryId: string
  title: string
  slug: string
  authorId: string
  body: string
  linkPreviewUrl?: string
}) {
  return db.post.create({
    data: {
      categoryId: data.categoryId,
      title: data.title,
      slug: data.slug,
      authorId: data.authorId,
      body: data.body,
      linkPreviewUrl: data.linkPreviewUrl ?? null,
    },
  })
}

export async function createCommentRecord(data: {
  postId: string
  authorId: string
  body: string
}) {
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        postId: data.postId,
        authorId: data.authorId,
        body: data.body,
      },
    })
    await tx.post.update({
      where: { id: data.postId },
      data: {
        lastReplyAt: new Date(),
        lastReplyById: data.authorId,
        commentCount: { increment: 1 },
      },
    })
    return comment
  })
}

export async function voteOnContent(data: {
  userId: string
  postId?: string
  commentId?: string
  value: 1 | -1
}) {
  const { userId, postId, commentId, value } = data
  if (!postId && !commentId) throw new Error('Must provide postId or commentId')

  const existing = await db.vote.findFirst({
    where: { userId, ...(postId ? { postId } : { commentId }) },
  })

  let scoreDelta: number
  if (!existing) {
    await db.vote.create({
      data: { userId, postId: postId ?? null, commentId: commentId ?? null, value },
    })
    scoreDelta = value
  } else if (existing.value === value) {
    await db.vote.delete({ where: { id: existing.id } })
    scoreDelta = -value
  } else {
    await db.vote.update({ where: { id: existing.id }, data: { value } })
    scoreDelta = value * 2
  }

  if (postId) {
    const post = await db.post.update({
      where: { id: postId },
      data: { voteScore: { increment: scoreDelta } },
      select: { authorId: true, voteScore: true },
    })
    await db.user.update({
      where: { id: post.authorId },
      data: { karma: { increment: scoreDelta } },
    })
    return { voteScore: post.voteScore }
  } else {
    const comment = await db.comment.update({
      where: { id: commentId! },
      data: { voteScore: { increment: scoreDelta } },
      select: { authorId: true, voteScore: true },
    })
    await db.user.update({
      where: { id: comment.authorId },
      data: { karma: { increment: scoreDelta } },
    })
    return { voteScore: comment.voteScore }
  }
}
