'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db/client'
import { grantXP } from '@/modules/xp'
import {
  getQuizById,
  submitQuizAttempt,
  checkCourseCompletion,
  createCertificate,
} from '../lib/queries'
import { scoreQuiz, calculateQuizXp } from '../lib/scoring'
import type { QuizOption } from '../types'
import type { Tier } from '@/generated/prisma/client'

// ── Input schema ──────────────────────────────────────────────

const submitQuizSchema = z.object({
  quizId: z.string().cuid(),
  answers: z.record(z.string(), z.string()),
})

// ── Result type ───────────────────────────────────────────────

export type SubmitQuizResult =
  | {
      success: true
      score: number
      tier: string
      xpEarned: number
      correctCount: number
      totalCount: number
      courseCompleted: boolean
      certificateTier: string | null
    }
  | { success: false; error: string }

// ── Helpers ───────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = {
  gold: 3,
  silver: 2,
  bronze: 1,
  incomplete: 0,
}

function getWorstTier(tiers: Tier[]): Tier {
  let worst: Tier = 'gold'
  for (const t of tiers) {
    if (TIER_ORDER[t] < TIER_ORDER[worst]) {
      worst = t
    }
  }
  return worst
}

// ── Server action ─────────────────────────────────────────────

export async function submitQuiz(
  input: unknown,
): Promise<SubmitQuizResult> {
  try {
    const user = await requireAuth()

    const parsed = submitQuizSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid input' }
    }
    const { quizId, answers } = parsed.data

    await rateLimit({ userId: user.id, action: 'quiz-submit', maxPerMinute: 5 })

    // Fetch quiz with questions
    const quiz = await getQuizById(quizId)
    if (!quiz) {
      return { success: false, error: 'Quiz not found' }
    }

    // Cast JSON options to typed array and score the quiz
    const questions = quiz.questions.map((q) => ({
      id: q.id,
      options: q.options as unknown as QuizOption[],
    }))

    const result = scoreQuiz(questions, answers)

    // Calculate Learn-specific XP for the attempt record
    const xpEarned = calculateQuizXp(
      result.correctCount,
      quiz.difficulty,
      result.tier,
      0, // streakDays — XP engine handles streak multipliers separately
    )

    // Save the attempt to the database
    const attempt = await submitQuizAttempt({
      userId: user.id,
      quizId,
      score: result.score,
      tier: result.tier,
      xpEarned,
      answers: result.answers,
    })

    // Grant ecosystem-wide XP (idempotent via refId)
    await grantXP({
      userId: user.id,
      event: 'learn_quiz_completed',
      module: 'learn',
      refId: attempt.id,
    })

    // Check for course completion if quiz belongs to a module with a course
    let courseCompleted = false
    let certificateTier: string | null = null

    if (quiz.moduleId) {
      const mod = await db.learnModule.findUnique({
        where: { id: quiz.moduleId! },
        select: { courseId: true },
      })

      if (mod?.courseId) {
        const completion = await checkCourseCompletion(user.id, mod.courseId)

        if (completion.completed) {
          courseCompleted = true
          const worstTier = getWorstTier(
            completion.bestTiers.filter((t): t is Exclude<Tier, 'incomplete'> => t !== 'incomplete'),
          )
          certificateTier = worstTier

          await createCertificate(user.id, mod.courseId, worstTier)
          await grantXP({
            userId: user.id,
            event: 'learn_course_completed',
            module: 'learn',
            refId: mod.courseId,
          })
        }
      }
    }

    return {
      success: true,
      score: result.score,
      tier: result.tier,
      xpEarned,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      courseCompleted,
      certificateTier,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { success: false, error: error.message }
    }
    throw error
  }
}
