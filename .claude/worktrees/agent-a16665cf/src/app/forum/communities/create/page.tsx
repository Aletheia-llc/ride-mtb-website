import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Crown } from 'lucide-react'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { createForumCommunity } from '@/modules/forum/actions/createCommunity'

export const metadata: Metadata = {
  title: 'Create Community | Ride MTB Forum',
}

export default async function CreateCommunityPage() {
  const session = await auth()
  const userRole = (session?.user as { role?: string } | undefined)?.role ?? null

  if (!session?.user || !['admin', 'instructor'].includes(userRole ?? '')) {
    redirect('/forum/communities')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-[var(--color-text)]">
        <Crown className="h-6 w-6" />
        Create a Community
      </h1>

      <form action={createForumCommunity} className="flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
        <div>
          <label htmlFor="community-name" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
            Community Name
          </label>
          <input
            id="community-name"
            name="name"
            type="text"
            required
            placeholder="Trail Builders Club"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div>
          <label htmlFor="community-slug" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
            Slug
          </label>
          <input
            id="community-slug"
            name="slug"
            type="text"
            placeholder="trail-builders-club"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)]"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Leave blank to auto-generate from the name.</p>
        </div>

        <div>
          <label htmlFor="community-description" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
            Description
          </label>
          <textarea
            id="community-description"
            name="description"
            rows={3}
            placeholder="What is this community about?"
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div>
          <label htmlFor="community-color" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
            Accent Color
          </label>
          <div className="flex items-center gap-3">
            <input
              id="community-color"
              name="color"
              type="color"
              defaultValue="#3b82f6"
              className="h-9 w-16 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-0.5"
            />
            <span className="text-xs text-[var(--color-text-muted)]">Used for the community cover when no image is set</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/forum/communities"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            Create Community
          </button>
        </div>
      </form>
    </div>
  )
}
