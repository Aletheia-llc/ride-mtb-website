import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ArticleEditForm } from '../[id]/edit/ArticleEditForm'
import { saveArticleAction } from '@/modules/editorial'

export const metadata: Metadata = {
  title: 'New Article | Admin | Ride MTB',
}

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/news"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">New Article</h1>
      </div>

      <ArticleEditForm saveAction={saveArticleAction} />
    </div>
  )
}
