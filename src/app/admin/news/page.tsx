import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { getAdminArticles } from '@/modules/editorial/lib/queries'
import { ARTICLE_CATEGORY_LABELS, togglePublishAction, deleteArticleAction } from '@/modules/editorial'
import type { ArticleCategory } from '@/modules/editorial'

export const metadata: Metadata = {
  title: 'News Articles | Admin | Ride MTB',
}

interface AdminNewsPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminNewsPage({ searchParams }: AdminNewsPageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const { articles, totalCount } = await getAdminArticles(page)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">News Articles</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalCount} article{totalCount !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="h-4 w-4" />
          New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
          <p className="text-[var(--color-text-muted)]">No articles yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Title</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Category</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Published</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/news/${article.id}/edit`}
                      className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {ARTICLE_CATEGORY_LABELS[article.category as ArticleCategory]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        article.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {article.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {article.publishedAt
                      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(article.publishedAt))
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/news/${article.id}/edit`}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      >
                        Edit
                      </Link>
                      <form action={togglePublishAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <input
                          type="hidden"
                          name="publish"
                          value={article.status === 'published' ? 'false' : 'true'}
                        />
                        <button
                          type="submit"
                          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        >
                          {article.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                      </form>
                      <form action={deleteArticleAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
