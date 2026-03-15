'use client'
import { useActionState, useState, useCallback } from 'react'
import { ArticleEditor } from '@/modules/editorial'
import type { SaveArticleState } from '@/modules/editorial'
import type { ArticleDetail, ArticleCategory } from '@/modules/editorial'
import { ARTICLE_CATEGORY_LABELS } from '@/modules/editorial'
import type { JSONContent } from '@tiptap/react'

interface ArticleEditFormProps {
  article?: ArticleDetail
  saveAction: (prev: SaveArticleState, formData: FormData) => Promise<SaveArticleState>
}

const CATEGORIES: ArticleCategory[] = ['news', 'gear_review', 'trail_spotlight', 'how_to', 'culture']

export function ArticleEditForm({ article, saveAction }: ArticleEditFormProps) {
  const [body, setBody] = useState<JSONContent | undefined>(
    article?.body as JSONContent | undefined,
  )
  const [state, formAction, pending] = useActionState(saveAction, {
    errors: null,
    articleId: article?.id ?? null,
  })

  const handleBodyChange = useCallback((content: JSONContent) => {
    setBody(content)
  }, [])

  return (
    <form action={formAction} className="space-y-6">
      {article?.id && <input type="hidden" name="id" value={article.id} />}
      <input type="hidden" name="body" value={JSON.stringify(body ?? {})} />

      {state.errors && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.errors}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          defaultValue={article?.title}
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          placeholder="Article title"
        />
      </div>

      {/* Excerpt */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Excerpt</label>
        <textarea
          name="excerpt"
          defaultValue={article?.excerpt ?? ''}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
          placeholder="Short summary (shown in article cards and meta description)"
        />
      </div>

      {/* Category + Cover URL row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Category</label>
          <select
            name="category"
            defaultValue={article?.category ?? 'news'}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ARTICLE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Cover Image URL</label>
          <input
            name="coverImageUrl"
            defaultValue={article?.coverImageUrl ?? ''}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Tags</label>
        <input
          name="tags"
          defaultValue={article?.tags?.join(', ') ?? ''}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          placeholder="trail-building, technique, gear (comma-separated)"
        />
      </div>

      {/* Body editor */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Body</label>
        <ArticleEditor
          initialContent={article?.body as JSONContent | undefined}
          onChange={handleBodyChange}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save Draft'}
        </button>
      </div>
    </form>
  )
}
