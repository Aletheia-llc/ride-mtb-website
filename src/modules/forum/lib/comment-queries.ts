import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db/client'
import { PAGE_SIZE, authorSelect, authorDetailSelect } from './_selects'

export async function getComments(
  postId: string,
  sort: 'oldest' | 'newest' | 'best' = 'oldest',
  page = 1,
) {
  const skip = (page - 1) * PAGE_SIZE
  const where: Prisma.CommentWhereInput = { postId, deletedAt: null }

  const orderBy:
    | Prisma.CommentOrderByWithRelationInput
    | Prisma.CommentOrderByWithRelationInput[] =
    sort === 'newest' ? { createdAt: 'desc' }
    : sort === 'best' ? [{ voteScore: 'desc' }, { createdAt: 'asc' }]
    : { createdAt: 'asc' }

  const [comments, total] = await Promise.all([
    db.comment.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      include: { author: { select: authorDetailSelect } },
    }),
    db.comment.count({ where }),
  ])

  return { comments, total, pageCount: Math.ceil(total / PAGE_SIZE) }
}

export async function searchComments(query: string) {
  return db.comment.findMany({
    where: {
      deletedAt: null,
      body: { contains: query, mode: 'insensitive' },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: authorSelect },
      post: { select: { id: true, title: true, slug: true } },
    },
  })
}

export async function createCommentRecord(data: {
  postId: string
  authorId: string
  body: string
  parentId?: string
}) {
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        postId: data.postId,
        authorId: data.authorId,
        body: data.body,
        parentId: data.parentId ?? null,
      },
    })
    await tx.post.update({
      where: { id: data.postId },
      data: {
        lastReplyAt: new Date(),
        lastReplyById: data.authorId,
        commentCount: { increment: 1 },
      },
    })
    return comment
  })
}

export async function voteOnContent(data: {
  userId: string
  postId?: string
  commentId?: string
  value: 1 | -1
}) {
  const { userId, postId, commentId, value } = data
  if (!postId && !commentId) throw new Error('Must provide postId or commentId')

  const existing = await db.vote.findFirst({
    where: { userId, ...(postId ? { postId } : { commentId }) },
  })

  let scoreDelta: number
  if (!existing) {
    await db.vote.create({
      data: { userId, postId: postId ?? null, commentId: commentId ?? null, value },
    })
    scoreDelta = value
  } else if (existing.value === value) {
    await db.vote.delete({ where: { id: existing.id } })
    scoreDelta = -value
  } else {
    await db.vote.update({ where: { id: existing.id }, data: { value } })
    scoreDelta = value * 2
  }

  if (postId) {
    const post = await db.post.update({
      where: { id: postId },
      data: { voteScore: { increment: scoreDelta } },
      select: { authorId: true, voteScore: true },
    })
    await db.user.update({
      where: { id: post.authorId },
      data: { karma: { increment: scoreDelta } },
    })
    return { voteScore: post.voteScore }
  } else {
    const comment = await db.comment.update({
      where: { id: commentId! },
      data: { voteScore: { increment: scoreDelta } },
      select: { authorId: true, voteScore: true },
    })
    await db.user.update({
      where: { id: comment.authorId },
      data: { karma: { increment: scoreDelta } },
    })
    return { voteScore: comment.voteScore }
  }
}
