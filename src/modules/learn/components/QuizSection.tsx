'use client'

import { useState } from 'react'
import { Brain } from 'lucide-react'
import { Button, Card } from '@/ui/components'
import { QuizFlow } from './QuizFlow'
import type { QuestionData, QuizResultData } from '@/modules/learn/types'

interface QuizSectionProps {
  quiz: {
    id: string
    title: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    questions: QuestionData[]
  }
  courseUrl: string
  nextModuleUrl: string | null
}

export function QuizSection({ quiz, courseUrl, nextModuleUrl }: QuizSectionProps) {
  const [started, setStarted] = useState(false)
  const [, setSubmitting] = useState(false)

  const handleComplete = async (result: QuizResultData) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/learn/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, answers: result.answers }),
      })
      if (res.ok) {
        const data = await res.json()
        result.xpEarned = data.xpEarned
        result.courseCompleted = data.courseCompleted
        result.certificateTier = data.certificateTier
      }
    } catch {
      // Still show results even if submission fails
    } finally {
      setSubmitting(false)
    }
  }

  if (!started) {
    return (
      <Card className="text-center">
        <Brain className="mx-auto mb-4 h-12 w-12 text-[var(--color-primary)]" />
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">{quiz.title}</h3>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          {quiz.questions.length} questions &middot; Earn XP and badges by scoring well
        </p>
        <Button onClick={() => setStarted(true)} size="lg">
          Start Quiz
        </Button>
      </Card>
    )
  }

  return (
    <QuizFlow
      quizId={quiz.id}
      quizTitle={quiz.title}
      questions={quiz.questions}
      difficulty={quiz.difficulty}
      courseUrl={courseUrl}
      nextModuleUrl={nextModuleUrl}
      onComplete={handleComplete}
    />
  )
}
