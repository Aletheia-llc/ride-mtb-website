'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { createArticle, updateArticle } from '../lib/queries'
import type { ArticleCategory } from '../types'

export interface SaveArticleState {
  errors: string | null
  articleId: string | null
}

export async function saveArticleAction(
  _prev: SaveArticleState,
  formData: FormData,
): Promise<SaveArticleState> {
  const user = await requireAdmin()

  const id = formData.get('id') as string | null
  const title = (formData.get('title') as string | null)?.trim()
  const excerpt = (formData.get('excerpt') as string | null)?.trim() || undefined
  const coverImageUrl = (formData.get('coverImageUrl') as string | null)?.trim() || undefined
  const category = (formData.get('category') as ArticleCategory | null) ?? 'news'
  const tagsRaw = (formData.get('tags') as string | null)?.trim()
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
  const bodyRaw = formData.get('body') as string | null

  if (!title) {
    return { errors: 'Title is required', articleId: id }
  }

  let body: object = {}
  if (bodyRaw) {
    try {
      body = JSON.parse(bodyRaw)
    } catch {
      return { errors: 'Invalid article body', articleId: id }
    }
  }

  if (id) {
    await updateArticle(id, { title, excerpt, body, coverImageUrl, category, tags })
    revalidatePath('/admin/news')
    revalidatePath('/news')
    return { errors: null, articleId: id }
  } else {
    const article = await createArticle({ authorId: user.id, title, excerpt, body, coverImageUrl, category, tags })
    revalidatePath('/admin/news')
    redirect(`/admin/news/${article.id}/edit`)
    return { errors: null, articleId: article.id }
  }
}
