import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { getThreadBySlug } from '@/modules/forum/lib/queries'
import { ThreadPageClient } from './ThreadPageClient'
import type { ForumThread } from '@/modules/forum/types'

interface ThreadPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  const { slug } = await params
  const thread = await db.forumThread.findUnique({
    where: { slug, deletedAt: null },
    select: {
      title: true,
      posts: { where: { isFirst: true }, take: 1, select: { content: true } },
    },
  })
  if (!thread) return { title: 'Thread Not Found | Forum | Ride MTB' }

  return {
    title: `${thread.title} | Forum | Ride MTB`,
    description: thread.posts[0]?.content.slice(0, 160) ?? 'View this discussion on the Ride MTB forum.',
  }
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { slug } = await params

  const [thread, session] = await Promise.all([
    getThreadBySlug(slug),
    auth(),
  ])

  if (!thread) notFound()

  const currentUserId = session?.user?.id ?? null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ThreadPageClient
        thread={thread as unknown as ForumThread}
        currentUserId={currentUserId}
        currentUserRole={session?.user?.role ?? null}
      />
    </div>
  )
}
