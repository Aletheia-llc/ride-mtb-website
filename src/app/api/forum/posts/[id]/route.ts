import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const EDIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const content: unknown = body?.content

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 })
  }
  if (content.length > 10000) {
    return NextResponse.json({ error: 'content_too_long' }, { status: 400 })
  }

  const post = await db.forumPost.findUnique({
    where: { id },
    select: { id: true, authorId: true, createdAt: true, deletedAt: true, content: true },
  })

  if (!post || post.deletedAt !== null) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const isAuthor = post.authorId === session.user.id
  const isAdmin = session.user.role === 'admin'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isAdmin) {
    const age = Date.now() - new Date(post.createdAt).getTime()
    if (age > EDIT_WINDOW_MS) {
      return NextResponse.json({ error: 'edit_window_expired' }, { status: 403 })
    }
  }

  const updated = await db.forumPost.update({
    where: { id },
    data: { content: content.trim(), editedAt: new Date() },
    select: { id: true, content: true, editedAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const post = await db.forumPost.findUnique({
    where: { id },
    select: { id: true, authorId: true, isFirst: true, threadId: true, deletedAt: true },
  })

  if (!post) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (post.deletedAt) {
    return NextResponse.json({ error: 'Post already deleted' }, { status: 404 })
  }

  const isAuthor = post.authorId === session.user.id
  const isAdmin = session.user.role === 'admin'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  await db.forumPost.update({
    where: { id },
    data: { deletedAt: now },
  })

  if (post.isFirst) {
    await db.forumThread.update({
      where: { id: post.threadId },
      data: { deletedAt: now },
    })
  }

  return new NextResponse(null, { status: 204 })
}
