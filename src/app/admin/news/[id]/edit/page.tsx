import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { togglePublishAction, saveArticleAction } from '@/modules/editorial'
import type { ArticleCategory } from '@/modules/editorial'
import { ArticleEditForm } from './ArticleEditForm'
import type { JSONContent } from '@tiptap/react'

interface EditArticlePageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Edit Article | Admin | Ride MTB',
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params

  // eslint-disable-next-line no-restricted-imports
  const { db } = await import('@/lib/db/client')
  const raw = await db.article.findUnique({
    where: { id },
    include: { author: { select: { name: true, image: true } } },
  })

  if (!raw) notFound()

  const article = {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    body: raw.body as JSONContent,
    coverImageUrl: raw.coverImageUrl,
    category: raw.category as ArticleCategory,
    tags: raw.tags,
    status: raw.status as 'draft' | 'published',
    publishedAt: raw.publishedAt,
    createdAt: raw.createdAt,
    authorName: raw.author.name,
    authorImage: raw.author.image,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/news"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Edit Article</h1>
        </div>

        <div className="flex items-center gap-3">
          {article.status === 'published' && (
            <a
              href={`/news/${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              View Live ↗
            </a>
          )}
          <form action={togglePublishAction}>
            <input type="hidden" name="id" value={article.id} />
            <input
              type="hidden"
              name="publish"
              value={article.status === 'published' ? 'false' : 'true'}
            />
            <button
              type="submit"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                article.status === 'published'
                  ? 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {article.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </form>
        </div>
      </div>

      <ArticleEditForm article={article} saveAction={saveArticleAction} />
    </div>
  )
}
