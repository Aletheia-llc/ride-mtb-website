import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'

// ── Types ─────────────────────────────────────────────────────

interface CreateThreadInput {
  categoryId: string
  title: string
  slug: string
  authorId: string
  content: string
}

interface CreatePostInput {
  threadId: string
  authorId: string
  content: string
}

interface VoteOnPostInput {
  postId: string
  userId: string
  value: 1 | -1
}

// ── 1. getCategories ──────────────────────────────────────────

export async function getCategories() {
  return db.forumCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { threads: true } },
      threads: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          title: true,
          slug: true,
          createdAt: true,
        },
      },
    },
  })
}

// ── 2. getThreadsByCategory ───────────────────────────────────

export async function getThreadsByCategory(
  categorySlug: string,
  page: number = 1,
) {
  const category = await db.forumCategory.findUnique({
    where: { slug: categorySlug },
  })

  if (!category) return null

  const [threads, totalCount] = await Promise.all([
    db.forumThread.findMany({
      where: { categoryId: category.id },
      ...paginate(page),
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        posts: {
          where: { isFirst: true },
          take: 1,
          select: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        },
        _count: { select: { posts: true } },
      },
    }),
    db.forumThread.count({
      where: { categoryId: category.id },
    }),
  ])

  // Compute vote score sum for each thread in two efficient queries
  const threadIds = threads.map((t) => t.id)

  // Single query to get all posts for these threads (id + threadId only)
  const posts = await db.forumPost.findMany({
    where: { threadId: { in: threadIds } },
    select: { id: true, threadId: true },
  })

  const postIdToThreadId = new Map(posts.map((p) => [p.id, p.threadId]))
  const postIds = posts.map((p) => p.id)

  // Single groupBy for all votes across all posts
  const voteScores = postIds.length > 0
    ? await db.forumVote.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _sum: { value: true },
      })
    : []

  // Aggregate scores per thread
  const threadScores = new Map<string, number>()
  for (const vs of voteScores) {
    const threadId = postIdToThreadId.get(vs.postId)
    if (threadId) {
      threadScores.set(
        threadId,
        (threadScores.get(threadId) ?? 0) + (vs._sum.value ?? 0),
      )
    }
  }

  const threadsWithScores = threads.map((thread) => ({
    ...thread,
    voteScore: threadScores.get(thread.id) ?? 0,
  }))

  return { category, threads: threadsWithScores, totalCount }
}

// ── 3. getThreadBySlug ────────────────────────────────────────

export async function getThreadBySlug(slug: string) {
  const thread = await db.forumThread.findUnique({
    where: { slug },
    include: {
      category: {
        select: { name: true, slug: true },
      },
      posts: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              avatarUrl: true,
              forumBadges: {
                select: {
                  badgeSlug: true,
                  awardedAt: true,
                  badge: {
                    select: {
                      name: true,
                      description: true,
                      icon: true,
                      color: true,
                    },
                  },
                },
                orderBy: { awardedAt: 'asc' },
                take: 3,
              },
            },
          },
        },
      },
    },
  })

  if (!thread) return null

  // Increment viewCount atomically (fire-and-forget, don't block)
  void db.forumThread.update({
    where: { id: thread.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  // Batch-compute vote scores for all posts (avoids loading all vote rows)
  const postIds = thread.posts.map((p) => p.id)
  const voteScores = postIds.length > 0
    ? await db.forumVote.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _sum: { value: true },
      })
    : []

  const scoreMap = new Map(voteScores.map((v) => [v.postId, v._sum.value ?? 0]))

  const postsWithScores = thread.posts.map((post) => ({
    ...post,
    voteScore: scoreMap.get(post.id) ?? 0,
  }))

  return {
    ...thread,
    posts: postsWithScores,
  }
}

// ── 4. createThread ───────────────────────────────────────────

export async function createThread({
  categoryId,
  title,
  slug,
  authorId,
  content,
}: CreateThreadInput) {
  return db.$transaction(async (tx) => {
    const category = await tx.forumCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    })

    if (!category) {
      throw new Error('Category not found')
    }

    const thread = await tx.forumThread.create({
      data: {
        categoryId,
        title,
        slug,
      },
    })

    await tx.forumPost.create({
      data: {
        threadId: thread.id,
        authorId,
        content,
        isFirst: true,
      },
    })

    return thread
  })
}

// ── 5. createPost ─────────────────────────────────────────────

export async function createPost({
  threadId,
  authorId,
  content,
}: CreatePostInput) {
  return db.$transaction(async (tx) => {
    const thread = await tx.forumThread.findUnique({
      where: { id: threadId },
      select: { isLocked: true },
    })

    if (!thread) {
      throw new Error('Thread not found')
    }

    if (thread.isLocked) {
      throw new Error('Thread is locked')
    }

    return tx.forumPost.create({
      data: {
        threadId,
        authorId,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    })
  })
}

// ── 6. voteOnPost ─────────────────────────────────────────────

export async function voteOnPost({ postId, userId, value }: VoteOnPostInput) {
  const post = await db.forumPost.findUnique({
    where: { id: postId },
    select: { id: true },
  })

  if (!post) {
    throw new Error('Post not found')
  }

  const result = await db.forumVote.upsert({
    where: {
      postId_userId: { postId, userId },
    },
    create: {
      postId,
      userId,
      value,
    },
    update: {
      value,
    },
  })

  // Fire-and-forget karma update for post author
  const postWithAuthor = await db.forumPost.findUnique({
    where: { id: postId },
    select: { authorId: true },
  })
  if (postWithAuthor) {
    const karmaResult = await db.forumVote.aggregate({
      where: {
        post: { authorId: postWithAuthor.authorId },
      },
      _sum: { value: true },
    })
    void db.user.update({
      where: { id: postWithAuthor.authorId },
      data: { karma: karmaResult._sum.value ?? 0 },
    }).catch(() => {})
  }

  // Fire-and-forget hotScore update
  const thread = await db.forumThread.findFirst({
    where: { posts: { some: { id: postId } } },
    include: {
      _count: { select: { posts: true } },
    },
  })
  if (thread) {
    const allPostIds = (await db.forumPost.findMany({
      where: { threadId: thread.id },
      select: { id: true },
    })).map(p => p.id)
    const voteResult = await db.forumVote.aggregate({
      where: { postId: { in: allPostIds } },
      _sum: { value: true },
    })
    const newVoteScore = voteResult._sum.value ?? 0
    const replyCount = Math.max(0, thread._count.posts - 1)
    const newHotScore = calculateThreadHotScore(newVoteScore, replyCount, thread.createdAt)
    void db.forumThread.update({
      where: { id: thread.id },
      data: { hotScore: newHotScore },
    }).catch(() => {})
  }

  return result
}

// ── 7. getPostVoteScore ───────────────────────────────────────

export async function getPostVoteScore(postId: string): Promise<number> {
  const result = await db.forumVote.aggregate({
    where: { postId },
    _sum: { value: true },
  })

  return result._sum.value ?? 0
}

// ── 8. calculateThreadHotScore ────────────────────────────────

export function calculateThreadHotScore(
  voteScore: number,
  replyCount: number,
  createdAt: Date,
): number {
  const score = voteScore + replyCount * 2
  const order = Math.log10(Math.max(Math.abs(score), 1))
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0
  const timestamp = new Date(createdAt).getTime() / 1000
  return order + (sign * timestamp) / 45000
}

// ── 9. getAllThreads ───────────────────────────────────────────

export async function getAllThreads(
  sort: 'hot' | 'new' | 'top' = 'hot',
  page: number = 1,
  categorySlug?: string,
) {
  const where = categorySlug
    ? { category: { slug: categorySlug } }
    : {}

  const orderBy =
    sort === 'hot' ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
    : sort === 'new' ? [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]

  const [threads, totalCount] = await Promise.all([
    db.forumThread.findMany({
      where,
      ...paginate(page, 25),
      orderBy,
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
        tags: { include: { tag: true } },
        posts: {
          where: { isFirst: true },
          take: 1,
          include: {
            author: {
              select: { id: true, name: true, username: true, image: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: { select: { posts: true, bookmarks: true } },
      },
    }),
    db.forumThread.count({ where }),
  ])

  // compute voteScores efficiently
  const threadIds = threads.map((t) => t.id)
  const posts = await db.forumPost.findMany({
    where: { threadId: { in: threadIds } },
    select: { id: true, threadId: true },
  })
  const postIdToThreadId = new Map(posts.map((p) => [p.id, p.threadId]))
  const postIds = posts.map((p) => p.id)
  const voteScores = postIds.length > 0
    ? await db.forumVote.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _sum: { value: true },
      })
    : []
  const threadScores = new Map<string, number>()
  for (const vs of voteScores) {
    const threadId = postIdToThreadId.get(vs.postId)
    if (threadId) {
      threadScores.set(threadId, (threadScores.get(threadId) ?? 0) + (vs._sum.value ?? 0))
    }
  }

  return {
    threads: threads.map((t) => ({
      ...t,
      voteScore: threadScores.get(t.id) ?? 0,
      replyCount: Math.max(0, t._count.posts - 1),
    })),
    totalCount,
  }
}

// ── 10. getForumStats ─────────────────────────────────────────

export async function getForumStats() {
  const [threadCount, postCount, userCount] = await Promise.all([
    db.forumThread.count(),
    db.forumPost.count(),
    db.user.count(),
  ])
  return { threadCount, postCount, userCount }
}

// ── 11. getTopForumMembers ────────────────────────────────────

export async function getTopForumMembers(limit = 5) {
  const top = await db.forumPost.groupBy({
    by: ['authorId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })
  const authorIds = top.map((t) => t.authorId)
  const users = await db.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, username: true, image: true, avatarUrl: true, role: true, karma: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))
  return top.map((t, i) => ({
    rank: i + 1,
    user: userMap.get(t.authorId)!,
    postCount: t._count.id,
  })).filter((t) => t.user)
}

// ── 12. getPopularTags ────────────────────────────────────────

export async function getPopularTags(limit = 10) {
  const tags = await db.forumTag.findMany({
    include: { _count: { select: { threads: true } } },
    orderBy: { threads: { _count: 'desc' } },
    take: limit,
  })
  return tags
}

// ── 13. getLatestForumThreads ─────────────────────────────────

export async function getLatestForumThreads(limit = 5) {
  return db.forumThread.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true, slug: true, color: true } },
      posts: {
        where: { isFirst: true },
        take: 1,
        include: {
          author: { select: { name: true, username: true } },
        },
      },
    },
  })
}

// ── 14. getUserForumBookmarks ─────────────────────────────────

export async function getUserForumBookmarks(userId: string) {
  const bookmarks = await db.forumBookmark.findMany({
    where: { userId },
    select: { threadId: true },
  })
  return new Set(bookmarks.map((b) => b.threadId))
}

// ── 14b. getBookmarkedThreads ──────────────────────────────────

export async function getBookmarkedThreads(userId: string) {
  const bookmarks = await db.forumBookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      thread: {
        include: {
          category: { select: { id: true, name: true, slug: true, color: true } },
          tags: { include: { tag: true } },
          posts: {
            where: { isFirst: true },
            take: 1,
            include: {
              author: {
                select: { id: true, name: true, username: true, image: true, avatarUrl: true, role: true },
              },
            },
          },
          _count: { select: { posts: true, bookmarks: true } },
        },
      },
    },
  })

  const threads = bookmarks.map((b) => b.thread)
  const threadIds = threads.map((t) => t.id)

  const posts = await db.forumPost.findMany({
    where: { threadId: { in: threadIds } },
    select: { id: true, threadId: true },
  })
  const postIdToThreadId = new Map(posts.map((p) => [p.id, p.threadId]))
  const postIds = posts.map((p) => p.id)
  const voteScores = postIds.length > 0
    ? await db.forumVote.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _sum: { value: true },
      })
    : []
  const threadScores = new Map<string, number>()
  for (const vs of voteScores) {
    const threadId = postIdToThreadId.get(vs.postId)
    if (threadId) {
      threadScores.set(threadId, (threadScores.get(threadId) ?? 0) + (vs._sum.value ?? 0))
    }
  }

  return threads.map((t) => ({
    ...t,
    voteScore: threadScores.get(t.id) ?? 0,
    replyCount: Math.max(0, t._count.posts - 1),
  }))
}

// ── 15. getForumUserProfile ───────────────────────────────────

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
      _count: {
        select: {
          forumPosts: true,
        },
      },
    },
  })
}

// ── 16. searchForumThreads ────────────────────────────────────

const SEARCH_PAGE_SIZE = 20

export async function searchForumThreads(
  q: string,
  opts: {
    categorySlug?: string
    authorUsername?: string
    dateFrom?: string
    dateTo?: string
    sort?: 'date' | 'votes'
    page?: number
  } = {},
) {
  const skip = ((opts.page ?? 1) - 1) * SEARCH_PAGE_SIZE

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: any[] = [
    {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { posts: { some: { isFirst: true, content: { contains: q, mode: 'insensitive' } } } },
      ],
    },
  ]
  if (opts.categorySlug) andClauses.push({ category: { slug: opts.categorySlug } })
  if (opts.authorUsername) andClauses.push({ posts: { some: { isFirst: true, author: { username: opts.authorUsername } } } })
  if (opts.dateFrom) andClauses.push({ createdAt: { gte: new Date(opts.dateFrom) } })
  if (opts.dateTo) andClauses.push({ createdAt: { lte: new Date(opts.dateTo) } })
  const where = { AND: andClauses }

  const orderBy = opts.sort === 'votes'
    ? [{ hotScore: 'desc' as const }]
    : [{ createdAt: 'desc' as const }]

  const [threads, totalCount] = await Promise.all([
    db.forumThread.findMany({
      where,
      orderBy,
      take: SEARCH_PAGE_SIZE,
      skip,
      include: {
        category: { select: { name: true, slug: true, color: true } },
        tags: { include: { tag: true } },
        posts: {
          where: { isFirst: true },
          take: 1,
          include: {
            author: {
              select: { id: true, name: true, username: true, image: true, avatarUrl: true, role: true },
            },
          },
        },
        _count: { select: { posts: true } },
      },
    }),
    db.forumThread.count({ where }),
  ])

  return {
    threads: threads.map((t) => ({
      ...t,
      replyCount: Math.max(0, t._count.posts - 1),
    })),
    totalCount,
  }
}

export async function searchForumReplies(
  q: string,
  opts: {
    authorUsername?: string
    dateFrom?: string
    dateTo?: string
    page?: number
  } = {},
) {
  const skip = ((opts.page ?? 1) - 1) * SEARCH_PAGE_SIZE

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: any[] = [
    { isFirst: false },
    { content: { contains: q, mode: 'insensitive' } },
  ]
  if (opts.authorUsername) andClauses.push({ author: { username: opts.authorUsername } })
  if (opts.dateFrom) andClauses.push({ createdAt: { gte: new Date(opts.dateFrom) } })
  if (opts.dateTo) andClauses.push({ createdAt: { lte: new Date(opts.dateTo) } })
  const where = { AND: andClauses }

  const [posts, totalCount] = await Promise.all([
    db.forumPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: SEARCH_PAGE_SIZE,
      skip,
      include: {
        author: {
          select: { id: true, name: true, username: true, image: true, avatarUrl: true },
        },
        thread: { select: { title: true, slug: true } },
      },
    }),
    db.forumPost.count({ where }),
  ])

  return { posts, totalCount }
}

export async function searchForumUsers(
  q: string,
  opts: { page?: number } = {},
) {
  const skip = ((opts.page ?? 1) - 1) * SEARCH_PAGE_SIZE
  const where = {
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { username: { contains: q, mode: 'insensitive' as const } },
    ],
  }

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { karma: 'desc' },
      take: SEARCH_PAGE_SIZE,
      skip,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        avatarUrl: true,
        bio: true,
        karma: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ])

  return { users, totalCount }
}

export async function getForumSearchCounts(
  q: string,
  opts: {
    categorySlug?: string
    authorUsername?: string
    dateFrom?: string
    dateTo?: string
  } = {},
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threadClauses: any[] = [
    {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { posts: { some: { isFirst: true, content: { contains: q, mode: 'insensitive' } } } },
      ],
    },
  ]
  if (opts.categorySlug) threadClauses.push({ category: { slug: opts.categorySlug } })
  if (opts.authorUsername) threadClauses.push({ posts: { some: { isFirst: true, author: { username: opts.authorUsername } } } })
  if (opts.dateFrom) threadClauses.push({ createdAt: { gte: new Date(opts.dateFrom) } })
  if (opts.dateTo) threadClauses.push({ createdAt: { lte: new Date(opts.dateTo) } })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replyClauses: any[] = [
    { isFirst: false },
    { content: { contains: q, mode: 'insensitive' } },
  ]
  if (opts.authorUsername) replyClauses.push({ author: { username: opts.authorUsername } })
  if (opts.dateFrom) replyClauses.push({ createdAt: { gte: new Date(opts.dateFrom) } })
  if (opts.dateTo) replyClauses.push({ createdAt: { lte: new Date(opts.dateTo) } })

  const [threadCount, replyCount, userCount] = await Promise.all([
    db.forumThread.count({ where: { AND: threadClauses } }),
    db.forumPost.count({ where: { AND: replyClauses } }),
    db.user.count({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ],
      },
    }),
  ])

  return { threadCount, replyCount, userCount }
}

// ── 17. getUserForumThreads ───────────────────────────────────

export async function getUserForumThreads(userId: string, page = 1) {
  const threads = await db.forumThread.findMany({
    where: {
      posts: { some: { authorId: userId, isFirst: true } },
    },
    ...paginate(page, 20),
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, slug: true, color: true } },
      tags: { include: { tag: true } },
      posts: {
        where: { isFirst: true },
        take: 1,
        include: {
          author: {
            select: { id: true, name: true, username: true, image: true, avatarUrl: true, role: true },
          },
        },
      },
      _count: { select: { posts: true, bookmarks: true } },
    },
  })

  const threadIds = threads.map((t) => t.id)
  const posts = await db.forumPost.findMany({
    where: { threadId: { in: threadIds } },
    select: { id: true, threadId: true },
  })
  const postIdToThreadId = new Map(posts.map((p) => [p.id, p.threadId]))
  const postIds = posts.map((p) => p.id)
  const voteScores =
    postIds.length > 0
      ? await db.forumVote.groupBy({
          by: ['postId'],
          where: { postId: { in: postIds } },
          _sum: { value: true },
        })
      : []
  const threadScores = new Map<string, number>()
  for (const vs of voteScores) {
    const threadId = postIdToThreadId.get(vs.postId)
    if (threadId) {
      threadScores.set(threadId, (threadScores.get(threadId) ?? 0) + (vs._sum.value ?? 0))
    }
  }

  return threads.map((t) => ({
    ...t,
    voteScore: threadScores.get(t.id) ?? 0,
    replyCount: Math.max(0, t._count.posts - 1),
  }))
}

// ── 18. getForumCommunities ───────────────────────────────────

export async function getForumCommunities(opts: {
  q?: string
  sort?: 'popular' | 'newest'
} = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isGated: true }
  if (opts.q) where.name = { contains: opts.q, mode: 'insensitive' }

  const orderBy = opts.sort === 'newest'
    ? { createdAt: 'desc' as const }
    : { memberCount: 'desc' as const }

  return db.forumCategory.findMany({
    where,
    orderBy,
    include: {
      owner: { select: { username: true, image: true, avatarUrl: true } },
      _count: { select: { memberships: true, threads: true } },
    },
  })
}

// ── 19. getUserForumMemberships ───────────────────────────────

export async function getUserForumMemberships(userId: string) {
  const memberships = await db.forumCommunityMembership.findMany({
    where: { userId },
    select: { categoryId: true },
  })
  return new Set(memberships.map((m) => m.categoryId))
}

// ── 20. isCommunityMember ─────────────────────────────────────

export async function isCommunityMember(categoryId: string, userId: string) {
  const membership = await db.forumCommunityMembership.findUnique({
    where: { userId_categoryId: { userId, categoryId } },
  })
  return !!membership
}
