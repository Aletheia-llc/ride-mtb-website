'use client'

import { useState, useCallback } from 'react'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { Button, ProgressBar } from '@/ui/components'
import { MultipleChoice } from './MultipleChoice'
import { TrueFalse } from './TrueFalse'
import { ImageBased } from './ImageBased'
import { DragDrop } from './DragDrop'
import { DiagramMatch } from './DiagramMatch'
import { Hotspot } from './Hotspot'
import { QuizResults } from './QuizResults'
import type { QuestionData, QuizResultData, DragDropConfig, DiagramMatchConfig, HotspotConfig } from '@/modules/learn/types'

interface QuizFlowProps {
  quizId: string
  quizTitle: string
  questions: QuestionData[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  courseUrl?: string | null
  nextModuleUrl?: string | null
  onComplete?: (result: QuizResultData) => void
}

export function QuizFlow({
  quizTitle,
  questions,
  courseUrl,
  nextModuleUrl,
  onComplete,
}: QuizFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [interactiveAnswers, setInteractiveAnswers] = useState<Record<string, unknown>>({})
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { correct: boolean; selectedId: string }>>({})
  const [showExplanation, setShowExplanation] = useState(false)
  const [result, setResult] = useState<QuizResultData | null>(null)

  const question = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const hasAnswered = question && feedbackMap[question.id] !== undefined

  const handleSelect = useCallback(
    (optionId: string) => {
      if (!question || feedbackMap[question.id]) return

      setAnswers((prev) => ({ ...prev, [question.id]: optionId }))

      const correct = question.options.find((o) => o.id === optionId)?.isCorrect ?? false
      setFeedbackMap((prev) => ({
        ...prev,
        [question.id]: { correct, selectedId: optionId },
      }))
      setShowExplanation(true)
    },
    [question, feedbackMap]
  )

  const handleDragDropAnswer = useCallback(
    (orderedIds: string[]) => {
      if (!question) return
      setInteractiveAnswers((prev) => ({ ...prev, [question.id]: orderedIds }))
    },
    [question]
  )

  const handleDragDropCheck = useCallback(() => {
    if (!question) return
    const config = question.interactiveConfig as DragDropConfig
    const orderedIds = (interactiveAnswers[question.id] as string[]) || config.items.map((i) => i.id)
    const correct = config.correctOrder.every((id, i) => orderedIds[i] === id)
    const correctId = correct ? 'correct' : 'incorrect'

    setAnswers((prev) => ({ ...prev, [question.id]: correctId }))
    setFeedbackMap((prev) => ({
      ...prev,
      [question.id]: { correct, selectedId: correctId },
    }))
    setShowExplanation(true)
  }, [question, interactiveAnswers])

  const handleDiagramAnswer = useCallback(
    (matches: Record<string, string>) => {
      if (!question) return
      const config = question.interactiveConfig as DiagramMatchConfig
      const correct = config.targets.every((t) => matches[t.id] === t.labelId)
      const correctId = correct ? 'correct' : 'incorrect'

      setAnswers((prev) => ({ ...prev, [question.id]: correctId }))
      setFeedbackMap((prev) => ({
        ...prev,
        [question.id]: { correct, selectedId: correctId },
      }))
      setShowExplanation(true)
    },
    [question]
  )

  const handleNext = useCallback(() => {
    setShowExplanation(false)

    if (isLastQuestion) {
      const correctCount = Object.values(feedbackMap).filter((f) => f.correct).length
      const total = questions.length
      const score = total > 0 ? Math.round((correctCount / total) * 100) : 0

      let tier: QuizResultData['tier']
      if (score >= 90) tier = 'gold'
      else if (score >= 75) tier = 'silver'
      else if (score >= 60) tier = 'bronze'
      else tier = 'incomplete'

      const quizResult: QuizResultData = {
        score,
        tier,
        correctCount,
        totalCount: total,
        xpEarned: 0,
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: answers[q.id] || '',
          correct: feedbackMap[q.id]?.correct ?? false,
        })),
      }

      setResult(quizResult)
      onComplete?.(quizResult)
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [isLastQuestion, feedbackMap, questions, answers, onComplete])

  const handleRetake = useCallback(() => {
    setCurrentIndex(0)
    setAnswers({})
    setInteractiveAnswers({})
    setFeedbackMap({})
    setShowExplanation(false)
    setResult(null)
  }, [])

  if (result) {
    return (
      <QuizResults
        result={result}
        quizTitle={quizTitle}
        onRetake={handleRetake}
        nextModuleUrl={nextModuleUrl}
        courseUrl={courseUrl}
      />
    )
  }

  if (!question) return null

  const isInteractive = ['drag_drop', 'diagram_match'].includes(question.type)
  const needsCheckButton = isInteractive && !hasAnswered

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
        </div>
        <ProgressBar value={currentIndex + 1} max={questions.length} />
      </div>

      <div className="mb-6">
        {question.type === 'multiple_choice' && (
          <MultipleChoice
            prompt={question.prompt}
            options={question.options}
            selectedId={answers[question.id] || null}
            feedback={feedbackMap[question.id] || null}
            onSelect={handleSelect}
          />
        )}
        {question.type === 'true_false' && (
          <TrueFalse
            prompt={question.prompt}
            options={question.options}
            selectedId={answers[question.id] || null}
            feedback={feedbackMap[question.id] || null}
            onSelect={handleSelect}
          />
        )}
        {question.type === 'image_based' && (
          <ImageBased
            prompt={question.prompt}
            promptImageUrl={question.promptImageUrl}
            options={question.options}
            selectedId={answers[question.id] || null}
            feedback={feedbackMap[question.id] || null}
            onSelect={handleSelect}
          />
        )}
        {question.type === 'drag_drop' && question.interactiveConfig && (
          <DragDrop
            prompt={question.prompt}
            config={question.interactiveConfig as DragDropConfig}
            feedback={feedbackMap[question.id] || null}
            onAnswer={handleDragDropAnswer}
          />
        )}
        {question.type === 'diagram_match' && question.interactiveConfig && (
          <DiagramMatch
            prompt={question.prompt}
            config={question.interactiveConfig as DiagramMatchConfig}
            feedback={feedbackMap[question.id] || null}
            onAnswer={handleDiagramAnswer}
          />
        )}
        {question.type === 'hotspot' && question.interactiveConfig && (
          <Hotspot
            prompt={question.prompt}
            config={question.interactiveConfig as HotspotConfig}
            selectedId={answers[question.id] || null}
            feedback={feedbackMap[question.id] || null}
            onSelect={handleSelect}
          />
        )}
      </div>

      {showExplanation && hasAnswered && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            feedbackMap[question.id]?.correct
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}
          role="status"
        >
          <div className="mb-1 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {feedbackMap[question.id]?.correct ? 'Correct!' : 'Not quite.'}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">{question.explanation}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        {needsCheckButton && (
          <Button onClick={handleDragDropCheck}>Check Answer</Button>
        )}
        {hasAnswered && (
          <Button onClick={handleNext}>
            {isLastQuestion ? 'View Results' : 'Next Question'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
