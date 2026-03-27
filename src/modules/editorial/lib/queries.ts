import 'server-only'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import { uniqueSlug } from '@/lib/slugify'
import type { ArticleCategory, ArticleStatus, ArticleSummary, ArticleDetail, ArticleAdminRow } from '../types'
import type { JSONContent } from '@tiptap/react'

// ── Shared select ─────────────────────────────────────────

const summarySelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  category: true,
  tags: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  author: { select: { name: true } },
} as const

// ── getPublishedArticles ──────────────────────────────────

interface ArticleFilters {
  category?: ArticleCategory
  tag?: string
  search?: string
}

export async function getPublishedArticles(
  filters?: ArticleFilters,
  page: number = 1,
): Promise<{ articles: ArticleSummary[]; totalCount: number }> {
  const where: Record<string, unknown> = { status: 'published' }

  if (filters?.category) where.category = filters.category
  if (filters?.tag) where.tags = { has: filters.tag }
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { excerpt: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [rawArticles, totalCount] = await Promise.all([
    db.article.findMany({
      where,
      ...paginate(page),
      orderBy: { publishedAt: 'desc' },
      select: summarySelect,
    }),
    db.article.count({ where }),
  ])

  const articles: ArticleSummary[] = rawArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: a.status as 'published',
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorName: a.author.name,
  }))

  return { articles, totalCount }
}

// ── getArticleBySlug ──────────────────────────────────────

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const a = await db.article.findUnique({
    where: { slug },
    include: { author: { select: { name: true, image: true } } },
  })

  if (!a) return null

  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    body: a.body as JSONContent,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: a.status as 'draft' | 'published',
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorName: a.author.name,
    authorImage: a.author.image,
    updatedAt: a.updatedAt,
  }
}

// ── getAdminArticles ──────────────────────────────────────

export async function getAdminArticles(
  page: number = 1,
): Promise<{ articles: ArticleAdminRow[]; totalCount: number }> {
  const [rawArticles, totalCount] = await Promise.all([
    db.article.findMany({
      ...paginate(page),
      orderBy: { createdAt: 'desc' },
      select: { ...summarySelect, authorId: true },
    }),
    db.article.count(),
  ])

  const articles: ArticleAdminRow[] = rawArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: a.status as ArticleStatus,
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorId: a.authorId,
    authorName: a.author.name,
  }))

  return { articles, totalCount }
}

// ── createArticle ─────────────────────────────────────────

interface CreateArticleInput {
  authorId: string
  title: string
  excerpt?: string
  body?: JSONContent
  coverImageUrl?: string
  category?: ArticleCategory
  tags?: string[]
}

export async function createArticle(input: CreateArticleInput) {
  const slug = await uniqueSlug(input.title, async (candidate) => {
    const existing = await db.article.findUnique({ where: { slug: candidate } })
    return existing !== null
  })

  return db.article.create({
    data: {
      authorId: input.authorId,
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      body: input.body ?? {},
      coverImageUrl: input.coverImageUrl ?? null,
      category: input.category ?? 'news',
      tags: input.tags ?? [],
    },
  })
}

// ── updateArticle ─────────────────────────────────────────

interface UpdateArticleInput {
  title?: string
  excerpt?: string
  body?: JSONContent
  coverImageUrl?: string
  category?: ArticleCategory
  tags?: string[]
}

export async function updateArticle(id: string, input: UpdateArticleInput) {
  return db.article.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.tags !== undefined && { tags: input.tags }),
    },
  })
}

// ── publishArticle ────────────────────────────────────────

export async function publishArticle(id: string, publish: boolean = true) {
  return db.article.update({
    where: { id },
    data: {
      status: publish ? 'published' : 'draft',
      publishedAt: publish ? new Date() : null,
    },
  })
}

// ── deleteArticle ─────────────────────────────────────────

export async function deleteArticle(id: string) {
  return db.article.delete({ where: { id } })
}

// ── getRecentPublishedArticles ────────────────────────────

export async function getRecentPublishedArticles(limit: number = 20): Promise<ArticleSummary[]> {
  const raw = await db.article.findMany({
    where: { status: 'published' },
    take: limit,
    orderBy: { publishedAt: 'desc' },
    select: summarySelect,
  })

  return raw.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: 'published' as const,
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorName: a.author.name,
  }))
}

// ── getAllPublishedArticleSlugs ────────────────────────────

export async function getAllPublishedArticleSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.article.findMany({
    where: { status: 'published' },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: 'desc' },
  })
}
