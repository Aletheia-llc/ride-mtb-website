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
  const requestBody = await req.json().catch(() => ({}))
  const body_content: unknown = requestBody?.body

  if (typeof body_content !== 'string' || body_content.trim().length === 0) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 })
  }
  if (body_content.length > 10000) {
    return NextResponse.json({ error: 'body_too_long' }, { status: 400 })
  }

  const post = await db.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, createdAt: true, deletedAt: true, body: true },
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

  const updated = await db.comment.update({
    where: { id },
    data: { body: body_content.trim(), editedAt: new Date() },
    select: { id: true, body: true, editedAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const comment = await db.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, deletedAt: true },
  })

  if (!comment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (comment.deletedAt) {
    return NextResponse.json({ error: 'Comment already deleted' }, { status: 404 })
  }

  const isAuthor = comment.authorId === session.user.id
  const isAdmin = session.user.role === 'admin'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  await db.comment.update({
    where: { id },
    data: { deletedAt: now },
  })

  return new NextResponse(null, { status: 204 })
}
