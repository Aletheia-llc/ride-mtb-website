import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    article: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/slugify', () => ({
  uniqueSlug: vi.fn(),
}))

vi.mock('@/lib/db/helpers', () => ({
  paginate: vi.fn(() => ({ take: 25, skip: 0 })),
}))

import { db } from '@/lib/db/client'
import { uniqueSlug } from '@/lib/slugify'
import {
  getPublishedArticles,
  getArticleBySlug,
  getAdminArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticle,
} from './queries'

const mockArticle = {
  id: 'art1',
  title: 'Test Article',
  slug: 'test-article',
  excerpt: 'Test excerpt',
  coverImageUrl: null,
  status: 'published' as const,
  category: 'news' as const,
  tags: [],
  authorId: 'user1',
  publishedAt: new Date('2026-03-14'),
  createdAt: new Date('2026-03-14'),
  updatedAt: new Date('2026-03-14'),
  author: { name: 'Kyle', image: null },
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getPublishedArticles', () => {
  it('fetches published articles paginated', async () => {
    vi.mocked(db.article.findMany).mockResolvedValue([mockArticle] as never)
    vi.mocked(db.article.count).mockResolvedValue(1)

    const result = await getPublishedArticles()

    expect(db.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'published' }),
      }),
    )
    expect(result.totalCount).toBe(1)
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0].slug).toBe('test-article')
  })

  it('filters by category when provided', async () => {
    vi.mocked(db.article.findMany).mockResolvedValue([] as never)
    vi.mocked(db.article.count).mockResolvedValue(0)

    await getPublishedArticles({ category: 'gear_review' })

    expect(db.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'gear_review', status: 'published' }),
      }),
    )
  })
})

describe('getArticleBySlug', () => {
  it('returns article for valid slug', async () => {
    vi.mocked(db.article.findUnique).mockResolvedValue({
      ...mockArticle,
      body: { type: 'doc', content: [] },
    } as never)

    const result = await getArticleBySlug('test-article')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('test-article')
  })

  it('returns null for unknown slug', async () => {
    vi.mocked(db.article.findUnique).mockResolvedValue(null)

    const result = await getArticleBySlug('not-found')
    expect(result).toBeNull()
  })
})

describe('createArticle', () => {
  it('generates unique slug and creates article', async () => {
    vi.mocked(uniqueSlug).mockResolvedValue('test-article')
    vi.mocked(db.article.create).mockResolvedValue(mockArticle as never)

    await createArticle({
      authorId: 'user1',
      title: 'Test Article',
      category: 'news',
    })

    expect(uniqueSlug).toHaveBeenCalledWith('Test Article', expect.any(Function))
    expect(db.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'test-article', authorId: 'user1' }),
      }),
    )
  })
})

describe('publishArticle', () => {
  it('sets status to published and sets publishedAt', async () => {
    vi.mocked(db.article.update).mockResolvedValue({ ...mockArticle, status: 'published' } as never)

    await publishArticle('art1')

    expect(db.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art1' },
        data: expect.objectContaining({ status: 'published', publishedAt: expect.any(Date) }),
      }),
    )
  })

  it('can unpublish by setting status to draft', async () => {
    vi.mocked(db.article.update).mockResolvedValue({ ...mockArticle, status: 'draft' } as never)

    await publishArticle('art1', false)

    expect(db.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'draft', publishedAt: null }),
      }),
    )
  })
})

describe('deleteArticle', () => {
  it('deletes article by id', async () => {
    vi.mocked(db.article.delete).mockResolvedValue(mockArticle as never)

    await deleteArticle('art1')

    expect(db.article.delete).toHaveBeenCalledWith({ where: { id: 'art1' } })
  })
})
