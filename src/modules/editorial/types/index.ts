import type { JSONContent } from '@tiptap/react'

export type ArticleStatus = 'draft' | 'published'

export type ArticleCategory =
  | 'news'
  | 'gear_review'
  | 'trail_spotlight'
  | 'how_to'
  | 'culture'

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  news: 'News',
  gear_review: 'Gear Review',
  trail_spotlight: 'Trail Spotlight',
  how_to: 'How-To',
  culture: 'Culture',
}

export interface ArticleSummary {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImageUrl: string | null
  category: ArticleCategory
  tags: string[]
  status: ArticleStatus
  publishedAt: Date | null
  createdAt: Date
  authorName: string | null
}

export interface ArticleDetail extends ArticleSummary {
  body: JSONContent
  authorImage: string | null
}

export interface ArticleAdminRow extends ArticleSummary {
  authorId: string
}
