import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin1', name: 'Admin', email: 'a@a.com', role: 'admin', image: null }),
}))

vi.mock('../lib/queries', () => ({
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  publishArticle: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireAdmin } from '@/lib/auth/guards'
import { createArticle, updateArticle, deleteArticle, publishArticle } from '../lib/queries'
import { saveArticleAction } from './saveArticle'
import { togglePublishAction } from './togglePublish'
import { deleteArticleAction } from './deleteArticle'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin1', name: 'Admin', email: 'a@a.com', role: 'admin', image: null } as never)
})

describe('saveArticleAction (create)', () => {
  it('creates article when no id provided', async () => {
    vi.mocked(createArticle).mockResolvedValue({ id: 'art1', slug: 'test' } as never)

    const formData = new FormData()
    formData.set('title', 'Test Article')
    formData.set('category', 'news')
    formData.set('body', JSON.stringify({ type: 'doc', content: [] }))

    const result = await saveArticleAction({ errors: null, articleId: null }, formData)

    expect(createArticle).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Article', authorId: 'admin1' }),
    )
    expect(result.errors).toBeNull()
  })

  it('returns error when title is missing', async () => {
    const formData = new FormData()
    formData.set('category', 'news')

    const result = await saveArticleAction({ errors: null, articleId: null }, formData)

    expect(result.errors).toContain('Title is required')
    expect(createArticle).not.toHaveBeenCalled()
  })

  it('updates article when id is provided', async () => {
    vi.mocked(updateArticle).mockResolvedValue({ id: 'art1' } as never)

    const formData = new FormData()
    formData.set('id', 'art1')
    formData.set('title', 'Updated Title')
    formData.set('category', 'gear_review')
    formData.set('body', JSON.stringify({ type: 'doc', content: [] }))

    await saveArticleAction({ errors: null, articleId: 'art1' }, formData)

    expect(updateArticle).toHaveBeenCalledWith('art1', expect.objectContaining({ title: 'Updated Title' }))
  })
})

describe('togglePublishAction', () => {
  it('calls publishArticle with correct publish state', async () => {
    vi.mocked(publishArticle).mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('id', 'art1')
    formData.set('publish', 'true')

    await togglePublishAction(formData)

    expect(publishArticle).toHaveBeenCalledWith('art1', true)
  })
})

describe('deleteArticleAction', () => {
  it('deletes article and redirects', async () => {
    vi.mocked(deleteArticle).mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('id', 'art1')

    await deleteArticleAction(formData)

    expect(deleteArticle).toHaveBeenCalledWith('art1')
  })
})
