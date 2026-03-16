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
  parentId?: string
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
  sort: 'hot' | 'new' | 'top' = 'hot',
  timePeriod: 'day' | 'week' | 'month' | 'all' = 'week',
) {
  const category = await db.forumCategory.findUnique({
    where: { slug: categorySlug },
  })

  if (!category) return null

  const topCutoff: Date | null =
    sort === 'top' && timePeriod !== 'all'
      ? new Date(Date.now() - { day: 1, week: 7, month: 30 }[timePeriod] * 86_400_000)
      : null

  const baseWhere = { categoryId: category.id, deletedAt: null }
  const whereWithTime = topCutoff
    ? { ...baseWhere, createdAt: { gte: topCutoff } }
    : baseWhere

  const orderBy =
    sort === 'hot' ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
    : sort === 'new' ? [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ isPinned: 'desc' as const }, { voteScore: 'desc' as const }]

  const [threads, totalCount] = await Promise.all([
    db.forumThread.findMany({
      where: whereWithTime,
      ...paginate(page),
      orderBy,
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
      where: whereWithTime,
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
        where: { isFirst: false, parentId: null, deletedAt: null },
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
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, name: true, username: true, image: true, avatarUrl: true } },
              replies: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'asc' },
                include: {
                  author: { select: { id: true, name: true, username: true, image: true, avatarUrl: true } },
                  replies: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                    include: {
                      author: { select: { id: true, name: true, username: true, image: true, avatarUrl: true } },
                    },
                  },
                },
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

  // Collect ALL post IDs recursively
  function collectPostIds(posts: { id: string; replies?: { id: string; replies?: unknown[] }[] }[]): string[] {
    return posts.flatMap(p => [p.id, ...collectPostIds((p.replies ?? []) as typeof posts)])
  }

  const allPostIds = [
    ...(thread.posts as { id: string; replies?: { id: string; replies?: unknown[] }[] }[]).flatMap(p =>
      collectPostIds([p as { id: string; replies?: { id: string; replies?: unknown[] }[] }])
    ),
  ]

  // Fetch the isFirst post separately
  const firstPostRaw = await db.forumPost.findFirst({
    where: { threadId: thread.id, isFirst: true },
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
  })

  if (firstPostRaw) allPostIds.push(firstPostRaw.id)

  // Batch-compute vote scores for all posts (avoids loading all vote rows)
  const voteScores = allPostIds.length > 0
    ? await db.forumVote.groupBy({
        by: ['postId'],
        where: { postId: { in: allPostIds } },
        _sum: { value: true },
      })
    : []

  const scoreMap = new Map(voteScores.map((v) => [v.postId, v._sum.value ?? 0]))

  function attachScores<T extends { id: string; replies?: T[] }>(posts: T[]): (T & { voteScore: number })[] {
    return posts.map(p => ({
      ...p,
      voteScore: scoreMap.get(p.id) ?? 0,
      replies: p.replies ? attachScores(p.replies) : undefined,
    }))
  }

  const postsWithScores = attachScores(thread.posts as Parameters<typeof attachScores>[0])

  const firstPost = firstPostRaw
    ? { ...firstPostRaw, voteScore: scoreMap.get(firstPostRaw.id) ?? 0, replies: [] }
    : null

  return {
    ...thread,
    posts: [
      ...(firstPost ? [firstPost] : []),
      ...postsWithScores,
    ],
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
  parentId,
}: CreatePostInput) {
  return db.$transaction(async (tx) => {
    const thread = await tx.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, isLocked: true },
    })

    if (!thread) {
      throw new Error('Thread not found')
    }

    if (thread.isLocked) {
      throw new Error('Thread is locked')
    }

    let depth = 0
    let resolvedParentId: string | null = null

    if (parentId) {
      const parent = await tx.forumPost.findUnique({
        where: { id: parentId },
        select: { id: true, depth: true, threadId: true },
      })
      if (!parent) throw new Error('Parent post not found')
      if (parent.threadId !== threadId) throw new Error('Parent post is not in this thread')
      if (parent.depth >= 3) throw new Error('Maximum reply depth reached')
      depth = parent.depth + 1
      resolvedParentId = parent.id
    }

    const post = await tx.forumPost.create({
      data: { threadId, authorId, content, isFirst: false, depth, parentId: resolvedParentId },
    })

    await tx.forumThread.update({
      where: { id: threadId },
      data: { lastReplyAt: new Date() },
    })

    return post
  })
}

// ── 6. voteOnPost ─────────────────────────────────────────────

export async function voteOnPost({ postId, userId, value }: VoteOnPostInput) {
  const result = await db.$transaction(async (tx) => {
    const post = await tx.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    })

    if (!post) throw new Error('Post not found')

    const vote = await tx.forumVote.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, value },
      update: { value },
    })

    // Recalculate karma atomically with the vote
    const karmaResult = await tx.forumVote.aggregate({
      where: { post: { authorId: post.authorId } },
      _sum: { value: true },
    })
    await tx.user.update({
      where: { id: post.authorId },
      data: { karma: karmaResult._sum.value ?? 0 },
    })

    return { vote, authorId: post.authorId }
  })

  const votedAuthorId = result.authorId

  // Fire-and-forget hotScore update
  void (async () => {
    try {
      const thread = await db.forumThread.findFirst({
        where: { posts: { some: { id: postId } } },
        include: { _count: { select: { posts: true } } },
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
        await db.forumThread.update({
          where: { id: thread.id },
          data: { hotScore: newHotScore, voteScore: newVoteScore },
        })
      }
    } catch {}
  })()

  return result.vote
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
  timePeriod: 'day' | 'week' | 'month' | 'all' = 'week',
) {
  const where = categorySlug
    ? { category: { slug: categorySlug }, deletedAt: null as null }
    : { deletedAt: null as null }

  // Time filter only applies to `top` sort
  const topCutoff: Date | null =
    sort === 'top' && timePeriod !== 'all'
      ? new Date(Date.now() - { day: 1, week: 7, month: 30 }[timePeriod] * 86_400_000)
      : null

  const whereWithTime = topCutoff
    ? { ...where, createdAt: { gte: topCutoff } }
    : where

  const orderBy =
    sort === 'hot' ? [{ isPinned: 'desc' as const }, { hotScore: 'desc' as const }]
    : sort === 'new' ? [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ isPinned: 'desc' as const }, { voteScore: 'desc' as const }]

  const [threads, totalCount] = await Promise.all([
    db.forumThread.findMany({
      where: whereWithTime,
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
    db.forumThread.count({ where: whereWithTime }),
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
    where: { deletedAt: null },
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
      },
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
    { deletedAt: null },
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

// ── 21. getForumLeaderboard ───────────────────────────────────

export async function getForumLeaderboard(limit = 50) {
  const users = await db.user.findMany({
    where: { karma: { gt: 0 } },
    orderBy: { karma: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      karma: true,
    },
  })

  // Count non-deleted posts per user
  const postCounts = await db.forumPost.groupBy({
    by: ['authorId'],
    where: {
      authorId: { in: users.map(u => u.id) },
      deletedAt: null,
    },
    _count: { id: true },
  })

  const countMap = new Map(postCounts.map(p => [p.authorId, p._count.id]))

  return users.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.name,
    username: u.username,
    image: u.image,
    avatarUrl: u.avatarUrl,
    karma: u.karma ?? 0,
    postCount: countMap.get(u.id) ?? 0,
  }))
}
