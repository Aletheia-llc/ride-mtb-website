import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getPostBySlug, getComments } from '@/modules/forum/lib/queries'
import { db } from '@/lib/db/client'
import { PostDetail } from '@/modules/forum/components/PostDetail'
import { CommentThread } from '@/modules/forum/components/CommentThread'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await db.post.findUnique({
    where: { slug, deletedAt: null },
    select: { title: true, body: true },
  })
  if (!post) return { title: 'Thread Not Found | Forum | Ride MTB' }

  return {
    title: `${post.title} | Forum | Ride MTB`,
    description: post.body.slice(0, 160) ?? 'View this discussion on the Ride MTB forum.',
  }
}

export default async function ThreadPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { sort = 'oldest', page = '1' } = await searchParams

  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const sortValue = (['oldest', 'newest', 'best'].includes(sort) ? sort : 'oldest') as 'oldest' | 'newest' | 'best'
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const [session, { comments, total, pageCount }] = await Promise.all([
    auth(),
    getComments(post.id, sortValue, pageNum),
  ])

  // Increment view count (fire and forget)
  void db.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  const isBookmarked = session?.user?.id
    ? !!(await db.bookmark.findUnique({
        where: { userId_postId: { userId: session.user.id, postId: post.id } },
      }))
    : false

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PostDetail
        post={post}
        currentUserId={session?.user?.id}
        isBookmarked={isBookmarked}
      />
      <CommentThread
        postId={post.id}
        comments={comments}
        total={total}
        pageCount={pageCount}
        currentPage={pageNum}
        activeSort={sortValue}
        currentUserId={session?.user?.id}
        isLocked={post.isLocked}
      />
    </div>
  )
}
