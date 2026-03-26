import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db/client'
import {
  PAGE_SIZE,
  authorSelect,
  authorDetailSelect,
  categorySelect,
  tagInclude,
  getTimePeriodStart,
} from './_selects'

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
