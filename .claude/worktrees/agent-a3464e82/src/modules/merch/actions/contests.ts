'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import type { ContestStatus } from '@/generated/prisma/client'

// --- Zod Schemas ---

const createContestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  productType: z.enum(['t-shirt', 'hoodie', 'jersey', 'sticker', 'hat', 'other']),
  submissionStart: z.coerce.date(),
  submissionEnd: z.coerce.date(),
  votingStart: z.coerce.date(),
  votingEnd: z.coerce.date(),
  prizeDescription: z.string().max(2000).optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
})

const updateContestSchema = createContestSchema.partial()

const submitDesignSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  imageUrl: z.string().url('Valid image URL is required'),
  mockupUrl: z.string().url().optional().or(z.literal('')),
})

// --- Admin CRUD ---

export async function adminCreateContest(data: {
  title: string
  description: string
  productType: string
  submissionStart: Date
  submissionEnd: Date
  votingStart: Date
  votingEnd: Date
  prizeDescription?: string
  coverImageUrl?: string
}) {
  await requireAdmin()

  const validated = createContestSchema.parse(data)

  const contest = await db.designContest.create({
    data: {
      title: validated.title,
      description: validated.description,
      productType: validated.productType,
      submissionStart: validated.submissionStart,
      submissionEnd: validated.submissionEnd,
      votingStart: validated.votingStart,
      votingEnd: validated.votingEnd,
      prizeDescription: validated.prizeDescription || null,
      coverImageUrl: validated.coverImageUrl || null,
    },
  })

  revalidatePath('/admin/merch/contests')
  revalidatePath('/merch/contests')
  return contest
}

export async function adminUpdateContest(
  id: string,
  data: Partial<{
    title: string
    description: string
    productType: string
    submissionStart: Date
    submissionEnd: Date
    votingStart: Date
    votingEnd: Date
    prizeDescription?: string
    coverImageUrl?: string
    status: ContestStatus
  }>,
) {
  await requireAdmin()

  const { status, ...rest } = data
  const validated = updateContestSchema.parse(rest)

  const updateData: Record<string, unknown> = {}
  if (validated.title !== undefined) updateData.title = validated.title
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.productType !== undefined) updateData.productType = validated.productType
  if (validated.submissionStart !== undefined) updateData.submissionStart = validated.submissionStart
  if (validated.submissionEnd !== undefined) updateData.submissionEnd = validated.submissionEnd
  if (validated.votingStart !== undefined) updateData.votingStart = validated.votingStart
  if (validated.votingEnd !== undefined) updateData.votingEnd = validated.votingEnd
  if (validated.prizeDescription !== undefined) updateData.prizeDescription = validated.prizeDescription || null
  if (validated.coverImageUrl !== undefined) updateData.coverImageUrl = validated.coverImageUrl || null
  if (status !== undefined) updateData.status = status

  const contest = await db.designContest.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/admin/merch/contests')
  revalidatePath('/merch/contests')
  revalidatePath(`/merch/contests/${id}`)
  return contest
}

export async function adminSelectWinner(contestId: string, submissionId: string) {
  await requireAdmin()

  const submission = await db.designSubmission.findUnique({
    where: { id: submissionId },
  })

  if (!submission) throw new Error('Submission not found')
  if (submission.contestId !== contestId) throw new Error('Submission does not belong to this contest')

  // Clear any previous winner in this contest
  await db.designSubmission.updateMany({
    where: { contestId, isWinner: true },
    data: { isWinner: false },
  })

  // Mark new winner
  await db.designSubmission.update({
    where: { id: submissionId },
    data: { isWinner: true },
  })

  // Update contest
  await db.designContest.update({
    where: { id: contestId },
    data: {
      winnerSubmissionId: submissionId,
      status: 'winner_announced',
    },
  })

  // TODO: grantXp(submission.userId, 200, 'merch', 'Design contest winner')
  // TODO: awardBadge(submission.userId, 'designer')

  revalidatePath('/admin/merch/contests')
  revalidatePath(`/admin/merch/contests/${contestId}`)
  revalidatePath('/merch/contests')
  revalidatePath(`/merch/contests/${contestId}`)
}

export async function adminRemoveSubmission(submissionId: string) {
  await requireAdmin()

  const submission = await db.designSubmission.findUnique({
    where: { id: submissionId },
  })

  if (!submission) throw new Error('Submission not found')

  // If this was the winner, clear that from the contest
  if (submission.isWinner) {
    await db.designContest.update({
      where: { id: submission.contestId },
      data: { winnerSubmissionId: null },
    })
  }

  // Delete submission (cascades votes via onDelete: Cascade)
  await db.designSubmission.delete({
    where: { id: submissionId },
  })

  revalidatePath('/admin/merch/contests')
  revalidatePath(`/admin/merch/contests/${submission.contestId}`)
  revalidatePath('/merch/contests')
  revalidatePath(`/merch/contests/${submission.contestId}`)
}

const STATUS_FLOW: ContestStatus[] = [
  'accepting_submissions',
  'voting',
  'closed',
  'winner_announced',
  'in_production',
  'completed',
]

export async function adminAdvanceContestPhase(contestId: string) {
  await requireAdmin()

  const contest = await db.designContest.findUnique({ where: { id: contestId } })
  if (!contest) throw new Error('Contest not found')

  const currentIndex = STATUS_FLOW.indexOf(contest.status)
  if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) {
    throw new Error('Contest is already in final phase')
  }

  const nextStatus = STATUS_FLOW[currentIndex + 1]

  await db.designContest.update({
    where: { id: contestId },
    data: { status: nextStatus },
  })

  revalidatePath('/admin/merch/contests')
  revalidatePath(`/admin/merch/contests/${contestId}`)
  revalidatePath('/merch/contests')
  revalidatePath(`/merch/contests/${contestId}`)
}

export async function adminDeleteContest(contestId: string) {
  await requireAdmin()
  await db.designContest.delete({ where: { id: contestId } })
  revalidatePath('/admin/merch/contests')
  revalidatePath('/merch/contests')
}

// --- Public Queries ---

export async function getActiveContests() {
  return db.designContest.findMany({
    where: {
      status: { not: 'completed' },
    },
    include: {
      submissions: {
        select: { id: true },
      },
    },
    orderBy: { submissionStart: 'desc' },
  })
}

export async function getContest(id: string) {
  const { auth } = await import('@/lib/auth/config')
  const session = await auth()
  const userId = session?.user?.id

  const contest = await db.designContest.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          votes: userId
            ? {
                where: { userId },
                select: { id: true, submissionId: true },
              }
            : false,
        },
        orderBy: { voteCount: 'desc' },
      },
    },
  })

  if (!contest) return null

  // Find which submission the current user voted for in this contest
  let userVotedForId: string | null = null
  if (userId) {
    for (const submission of contest.submissions) {
      if (Array.isArray(submission.votes) && submission.votes.length > 0) {
        userVotedForId = submission.id
        break
      }
    }
  }

  return { ...contest, userVotedForId }
}

export async function getAllContests() {
  return db.designContest.findMany({
    include: {
      submissions: {
        select: { id: true },
      },
    },
    orderBy: { submissionStart: 'desc' },
  })
}

export async function getContestForAdmin(id: string) {
  return db.designContest.findUnique({
    where: { id },
    include: {
      submissions: {
        orderBy: { voteCount: 'desc' },
      },
    },
  })
}

// --- Public Actions ---

export async function submitDesign(
  contestId: string,
  data: {
    title: string
    description?: string
    imageUrl: string
    mockupUrl?: string
  },
) {
  const user = await requireAuth()

  const validated = submitDesignSchema.parse(data)

  const contest = await db.designContest.findUnique({
    where: { id: contestId },
  })

  if (!contest) throw new Error('Contest not found')
  if (contest.status !== 'accepting_submissions') {
    throw new Error('This contest is no longer accepting submissions')
  }

  const now = new Date()
  if (now < contest.submissionStart || now > contest.submissionEnd) {
    throw new Error('Submission period is not active')
  }

  const existing = await db.designSubmission.findUnique({
    where: {
      contestId_userId: {
        contestId,
        userId: user.id,
      },
    },
  })

  if (existing) {
    throw new Error('You have already submitted a design for this contest')
  }

  const submission = await db.designSubmission.create({
    data: {
      contestId,
      userId: user.id,
      title: validated.title,
      description: validated.description || null,
      imageUrl: validated.imageUrl,
      mockupUrl: validated.mockupUrl || null,
    },
  })

  revalidatePath(`/merch/contests/${contestId}`)
  revalidatePath(`/merch/contests/${contestId}/submit`)
  revalidatePath(`/admin/merch/contests/${contestId}`)
  return submission
}

export async function voteForDesign(submissionId: string) {
  const user = await requireAuth()

  const submission = await db.designSubmission.findUnique({
    where: { id: submissionId },
    include: { contest: true },
  })

  if (!submission) throw new Error('Submission not found')
  if (submission.contest.status !== 'voting') {
    throw new Error('Voting is not currently open for this contest')
  }

  const now = new Date()
  if (now < submission.contest.votingStart || now > submission.contest.votingEnd) {
    throw new Error('Voting period is not active')
  }

  const existingVote = await db.designVote.findFirst({
    where: {
      userId: user.id,
      submission: {
        contestId: submission.contestId,
      },
    },
  })

  if (existingVote) {
    throw new Error(
      'You have already voted in this contest. Remove your current vote first to vote for a different design.',
    )
  }

  await db.designVote.create({
    data: {
      submissionId,
      userId: user.id,
    },
  })

  await db.designSubmission.update({
    where: { id: submissionId },
    data: { voteCount: { increment: 1 } },
  })

  revalidatePath(`/merch/contests/${submission.contestId}`)
}

export async function removeVote(submissionId: string) {
  const user = await requireAuth()

  const vote = await db.designVote.findUnique({
    where: {
      submissionId_userId: {
        submissionId,
        userId: user.id,
      },
    },
  })

  if (!vote) throw new Error("You haven't voted for this design")

  await db.designVote.delete({
    where: { id: vote.id },
  })

  await db.designSubmission.update({
    where: { id: submissionId },
    data: { voteCount: { decrement: 1 } },
  })

  const submission = await db.designSubmission.findUnique({
    where: { id: submissionId },
  })

  if (submission) {
    revalidatePath(`/merch/contests/${submission.contestId}`)
  }
}
