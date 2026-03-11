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

  return db.forumVote.upsert({
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
}

// ── 7. getPostVoteScore ───────────────────────────────────────

export async function getPostVoteScore(postId: string): Promise<number> {
  const result = await db.forumVote.aggregate({
    where: { postId },
    _sum: { value: true },
  })

  return result._sum.value ?? 0
}
