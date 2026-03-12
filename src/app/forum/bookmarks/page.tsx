import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getBookmarkedThreads } from '@/modules/forum/lib/queries'
// eslint-disable-next-line no-restricted-imports
import { ForumThreadCard } from '@/modules/forum/components/ForumThreadCard'
// eslint-disable-next-line no-restricted-imports
import { ForumSidebar } from '@/modules/forum/components/ForumSidebar'
import { Suspense } from 'react'
import { Bookmark } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Bookmarks | Forum | Ride MTB',
  description: 'Your saved forum threads.',
}

export default async function ForumBookmarksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/forum/bookmarks')

  const threads = await getBookmarkedThreads(session.user.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex gap-6">
        <Suspense fallback={<div className="w-60 shrink-0" />}>
          <ForumSidebar />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-[var(--color-primary)]" />
            <h1 className="text-lg font-semibold text-[var(--color-text)]">Saved Threads</h1>
            <span className="rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {threads.length}
            </span>
          </div>

          {threads.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-16 text-center">
              <Bookmark className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-muted)] opacity-40" />
              <p className="font-medium text-[var(--color-text-muted)]">No saved threads yet</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Bookmark threads from the forum to find them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <ForumThreadCard
                  key={thread.id}
                  thread={thread}
                  currentUserId={session.user.id}
                  initialBookmarked={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
