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
  const body: unknown = requestBody?.body

  if (typeof body !== 'string' || body.trim().length === 0) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 })
  }
  if (body.length > 10000) {
    return NextResponse.json({ error: 'body_too_long' }, { status: 400 })
  }

  const thread = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true, createdAt: true, deletedAt: true },
  })

  if (!thread || thread.deletedAt !== null) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const isAuthor = thread.authorId === session.user.id
  const isAdmin = session.user.role === 'admin'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isAdmin) {
    const age = Date.now() - new Date(thread.createdAt).getTime()
    if (age > EDIT_WINDOW_MS) {
      return NextResponse.json({ error: 'edit_window_expired' }, { status: 403 })
    }
  }

  const updated = await db.post.update({
    where: { id },
    data: { body: body.trim(), updatedAt: new Date() },
    select: { id: true, body: true, updatedAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const thread = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true, deletedAt: true, category: { select: { slug: true } } },
  })

  if (!thread || thread.deletedAt !== null) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const isAuthor = thread.authorId === session.user.id
  const isAdmin = session.user.role === 'admin'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.post.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ categorySlug: thread.category.slug })
}
