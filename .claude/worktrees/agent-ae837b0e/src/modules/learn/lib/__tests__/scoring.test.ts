import { describe, it, expect } from 'vitest'
import {
  getTierFromScore,
  scoreQuiz,
  calculateQuizXp,
  isBetterTier,
} from '../scoring'

// ── getTierFromScore ─────────────────────────────────────────

describe('getTierFromScore', () => {
  it('returns gold for score >= 90', () => {
    expect(getTierFromScore(90)).toBe('gold')
    expect(getTierFromScore(95)).toBe('gold')
    expect(getTierFromScore(100)).toBe('gold')
  })

  it('returns silver for score >= 75 and < 90', () => {
    expect(getTierFromScore(75)).toBe('silver')
    expect(getTierFromScore(80)).toBe('silver')
    expect(getTierFromScore(89)).toBe('silver')
  })

  it('returns bronze for score >= 60 and < 75', () => {
    expect(getTierFromScore(60)).toBe('bronze')
    expect(getTierFromScore(65)).toBe('bronze')
    expect(getTierFromScore(74)).toBe('bronze')
  })

  it('returns incomplete for score < 60', () => {
    expect(getTierFromScore(59)).toBe('incomplete')
    expect(getTierFromScore(0)).toBe('incomplete')
    expect(getTierFromScore(30)).toBe('incomplete')
  })

  it('handles boundary values exactly', () => {
    expect(getTierFromScore(90)).toBe('gold')
    expect(getTierFromScore(89)).toBe('silver')
    expect(getTierFromScore(75)).toBe('silver')
    expect(getTierFromScore(74)).toBe('bronze')
    expect(getTierFromScore(60)).toBe('bronze')
    expect(getTierFromScore(59)).toBe('incomplete')
  })
})

// ── scoreQuiz ────────────────────────────────────────────────

describe('scoreQuiz', () => {
  const questions = [
    {
      id: 'q1',
      options: [
        { id: 'a', text: 'A', isCorrect: true },
        { id: 'b', text: 'B', isCorrect: false },
      ],
    },
    {
      id: 'q2',
      options: [
        { id: 'c', text: 'C', isCorrect: false },
        { id: 'd', text: 'D', isCorrect: true },
      ],
    },
    {
      id: 'q3',
      options: [
        { id: 'e', text: 'E', isCorrect: true },
        { id: 'f', text: 'F', isCorrect: false },
      ],
    },
    {
      id: 'q4',
      options: [
        { id: 'g', text: 'G', isCorrect: false },
        { id: 'h', text: 'H', isCorrect: true },
      ],
    },
  ]

  it('scores all correct answers as gold', () => {
    const result = scoreQuiz(questions, {
      q1: 'a',
      q2: 'd',
      q3: 'e',
      q4: 'h',
    })
    expect(result.score).toBe(100)
    expect(result.tier).toBe('gold')
    expect(result.correctCount).toBe(4)
    expect(result.totalCount).toBe(4)
    expect(result.answers.every((a) => a.correct)).toBe(true)
  })

  it('scores all incorrect answers as incomplete', () => {
    const result = scoreQuiz(questions, {
      q1: 'b',
      q2: 'c',
      q3: 'f',
      q4: 'g',
    })
    expect(result.score).toBe(0)
    expect(result.tier).toBe('incomplete')
    expect(result.correctCount).toBe(0)
  })

  it('scores partial correct answers correctly', () => {
    // 3 out of 4 = 75% = silver
    const result = scoreQuiz(questions, {
      q1: 'a',
      q2: 'd',
      q3: 'e',
      q4: 'g',
    })
    expect(result.score).toBe(75)
    expect(result.tier).toBe('silver')
    expect(result.correctCount).toBe(3)
    expect(result.totalCount).toBe(4)
  })

  it('handles missing answers as incorrect', () => {
    const result = scoreQuiz(questions, { q1: 'a' })
    expect(result.correctCount).toBe(1)
    expect(result.totalCount).toBe(4)
    expect(result.score).toBe(25)
    expect(result.tier).toBe('incomplete')
  })

  it('handles empty question set', () => {
    const result = scoreQuiz([], {})
    expect(result.score).toBe(0)
    expect(result.tier).toBe('incomplete')
    expect(result.correctCount).toBe(0)
    expect(result.totalCount).toBe(0)
  })

  it('includes answer details', () => {
    const result = scoreQuiz(questions, { q1: 'a', q2: 'c' })
    const q1Answer = result.answers.find((a) => a.questionId === 'q1')
    const q2Answer = result.answers.find((a) => a.questionId === 'q2')
    expect(q1Answer?.correct).toBe(true)
    expect(q1Answer?.selectedOptionId).toBe('a')
    expect(q2Answer?.correct).toBe(false)
    expect(q2Answer?.selectedOptionId).toBe('c')
  })
})

// ── calculateQuizXp ──────────────────────────────────────────

describe('calculateQuizXp', () => {
  it('returns 0 for incomplete tier', () => {
    expect(calculateQuizXp(5, 'beginner', 'incomplete', 0)).toBe(0)
    expect(calculateQuizXp(10, 'advanced', 'incomplete', 5)).toBe(0)
  })

  it('calculates base XP for beginner gold (no streak)', () => {
    // 10 correct * 10 base * 1.0 difficulty * 1.5 gold * 1.0 streak = 150
    expect(calculateQuizXp(10, 'beginner', 'gold', 0)).toBe(150)
  })

  it('calculates XP for intermediate silver (no streak)', () => {
    // 8 correct * 10 base * 1.5 difficulty * 1.25 silver * 1.0 streak = 150
    expect(calculateQuizXp(8, 'intermediate', 'silver', 0)).toBe(150)
  })

  it('calculates XP for advanced bronze (no streak)', () => {
    // 6 correct * 10 base * 2.0 difficulty * 1.0 bronze * 1.0 streak = 120
    expect(calculateQuizXp(6, 'advanced', 'bronze', 0)).toBe(120)
  })

  it('applies streak multiplier', () => {
    // 10 correct * 10 base * 1.0 difficulty * 1.5 gold * 1.5 streak (10 days) = 225
    expect(calculateQuizXp(10, 'beginner', 'gold', 10)).toBe(225)
  })

  it('caps streak multiplier at 2x', () => {
    // 10 correct * 10 base * 1.0 difficulty * 1.5 gold * 2.0 streak (capped) = 300
    expect(calculateQuizXp(10, 'beginner', 'gold', 100)).toBe(300)
    // 20 days = 1 + 20*0.05 = 2.0 exactly at cap
    expect(calculateQuizXp(10, 'beginner', 'gold', 20)).toBe(300)
  })

  it('defaults streakDays to 0', () => {
    expect(calculateQuizXp(10, 'beginner', 'gold')).toBe(150)
  })
})

// ── isBetterTier ─────────────────────────────────────────────

describe('isBetterTier', () => {
  it('gold > silver > bronze > incomplete', () => {
    expect(isBetterTier('gold', 'silver')).toBe(true)
    expect(isBetterTier('silver', 'bronze')).toBe(true)
    expect(isBetterTier('bronze', 'incomplete')).toBe(true)
    expect(isBetterTier('gold', 'incomplete')).toBe(true)
  })

  it('same tier is not better', () => {
    expect(isBetterTier('gold', 'gold')).toBe(false)
    expect(isBetterTier('incomplete', 'incomplete')).toBe(false)
  })

  it('lower tier is not better', () => {
    expect(isBetterTier('silver', 'gold')).toBe(false)
    expect(isBetterTier('incomplete', 'bronze')).toBe(false)
  })
})
