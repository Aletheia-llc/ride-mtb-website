import 'server-only'
import { Difficulty, Tier } from '@/generated/prisma/client'
import type { QuizOption } from '../types'

// ── Tier thresholds ──────────────────────────────────────────

const TIER_ORDER: Record<Tier, number> = {
  gold: 3,
  silver: 2,
  bronze: 1,
  incomplete: 0,
}

export function getTierFromScore(score: number): Tier {
  if (score >= 90) return 'gold'
  if (score >= 75) return 'silver'
  if (score >= 60) return 'bronze'
  return 'incomplete'
}

/** Returns true if `a` is strictly better than `b`. */
export function isBetterTier(a: Tier, b: Tier): boolean {
  return TIER_ORDER[a] > TIER_ORDER[b]
}

// ── Quiz scoring ─────────────────────────────────────────────

interface QuizAnswer {
  questionId: string
  selectedOptionId: string
  correct: boolean
}

export interface QuizResult {
  score: number
  tier: Tier
  correctCount: number
  totalCount: number
  answers: QuizAnswer[]
}

interface ScoringQuestion {
  id: string
  options: QuizOption[]
}

export function scoreQuiz(
  questions: ScoringQuestion[],
  userAnswers: Record<string, string>,
): QuizResult {
  const answers: QuizAnswer[] = questions.map((question) => {
    const selectedOptionId = userAnswers[question.id] ?? ''
    const selectedOption = question.options.find(
      (opt) => opt.id === selectedOptionId,
    )
    return {
      questionId: question.id,
      selectedOptionId,
      correct: selectedOption?.isCorrect ?? false,
    }
  })

  const correctCount = answers.filter((a) => a.correct).length
  const totalCount = questions.length
  const score =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const tier = getTierFromScore(score)

  return { score, tier, correctCount, totalCount, answers }
}

// ── XP calculation ───────────────────────────────────────────

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  beginner: 1.0,
  intermediate: 1.5,
  advanced: 2.0,
}

const TIER_XP_MULTIPLIER: Record<Tier, number> = {
  gold: 1.5,
  silver: 1.25,
  bronze: 1.0,
  incomplete: 0,
}

const BASE_XP_PER_CORRECT = 10

/**
 * Calculate XP earned for a quiz attempt.
 *
 * Formula: correctAnswers * BASE * difficultyMult * tierMult * streakMult
 * Streak multiplier: 1 + (streakDays * 0.05), capped at 2x.
 */
export function calculateQuizXp(
  correctAnswers: number,
  difficulty: Difficulty,
  tier: Tier,
  streakDays: number = 0,
): number {
  if (tier === 'incomplete') return 0

  const diffMult = DIFFICULTY_MULTIPLIER[difficulty]
  const tierMult = TIER_XP_MULTIPLIER[tier]
  const streakMult = Math.min(1 + streakDays * 0.05, 2.0)

  return Math.round(
    correctAnswers * BASE_XP_PER_CORRECT * diffMult * tierMult * streakMult,
  )
}
