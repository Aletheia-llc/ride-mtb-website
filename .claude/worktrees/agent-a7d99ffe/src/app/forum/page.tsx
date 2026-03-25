import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquare, Plus } from 'lucide-react'
import { CategoryList } from '@/modules/forum'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getCategories } from '@/modules/forum/lib/queries'

export const metadata: Metadata = {
  title: 'Forum | Ride MTB',
  description:
    'Join the Ride MTB community forum. Discuss trails, gear, technique, and everything mountain biking.',
}

export default async function ForumPage() {
  const [categories, session] = await Promise.all([getCategories(), auth()])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <MessageSquare className="h-12 w-12 text-[var(--color-primary)]" />
        </div>
        <h1 className="mb-3 text-4xl font-bold text-[var(--color-text)] sm:text-5xl">
          Community Forum
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--color-text-muted)]">
          Connect with fellow riders. Ask questions, share stories, and help others on the trail.
        </p>
        {session?.user && (
          <div className="mt-6">
            <Link
              href="#categories"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              <Plus className="h-5 w-5" />
              Start a Discussion
            </Link>
          </div>
        )}
      </section>

      {/* Categories */}
      <section id="categories">
        <h2 className="mb-6 text-2xl font-bold text-[var(--color-text)]">
          Categories
        </h2>
        <CategoryList categories={categories} />
      </section>
    </div>
  )
}
