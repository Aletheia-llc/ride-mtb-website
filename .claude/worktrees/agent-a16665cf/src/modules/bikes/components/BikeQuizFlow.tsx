'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Bike } from 'lucide-react'
import { Button } from '@/ui/components'
import { ProgressBar } from '@/ui/components'
import { useQuizStore } from '../hooks/useQuizStore'
import { QUIZ_STEPS, TOTAL_STEPS } from '../lib/constants'
import { computeSpectrumCategory } from '../lib/spectrum'
import type { SpectrumResult } from '../types'
import { QuizStep } from './QuizStep'
import { ResultsView } from './ResultsView'

export function BikeQuizFlow() {
  const { currentStep, answers, isSubmitting, sessionToken, setAnswer, nextStep, prevStep, setSubmitting, reset } =
    useQuizStore()
  const [result, setResult] = useState<SpectrumResult | null>(null)
  const router = useRouter()

  const stepConfig = QUIZ_STEPS[currentStep - 1]

  const isStepValid = useCallback((): boolean => {
    switch (stepConfig?.key) {
      case 'experience':
        return answers.experience !== ''
      case 'terrain':
        return answers.terrain.length >= 1
      case 'ride_day':
        return answers.ride_day !== ''
      case 'priorities':
        return answers.priorities.length >= 1
      case 'preferences':
        return true // sliders always have a value
      case 'sizing':
        return answers.sizing.height_inches > 0 && answers.sizing.weight_lbs > 0
      default:
        return true
    }
  }, [stepConfig?.key, answers])

  function handleNext() {
    if (!isStepValid()) return
    if (currentStep === TOTAL_STEPS) {
      handleSubmit()
    } else {
      nextStep()
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const computed = computeSpectrumCategory(answers)

      // Attempt to persist to DB and navigate to results page
      try {
        const response = await fetch('/api/bikes/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, sessionToken }),
        })
        if (response.ok) {
          const data = await response.json() as { resultId: string; sessionId: string }
          router.push(`/bikes/selector/results/${data.resultId}`)
          return
        } else {
          console.error('[BikeQuizFlow] Submit API failed:', response.status, response.statusText)
        }
      } catch (err) {
        console.error('[BikeQuizFlow] API submit failed, falling back to inline results:', err)
      }

      // Fallback: show inline results if API fails or navigation is slow
      setResult(computed)
    } finally {
      setSubmitting(false)
    }
  }

  function handleRetake() {
    setResult(null)
    reset()
  }

  // Show results if computed
  if (result) {
    return (
      <div className="px-4 py-8">
        <ResultsView result={result} onRetake={handleRetake} />
      </div>
    )
  }

  // Quiz flow
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-[var(--color-primary)]">
          <Bike className="h-6 w-6" />
          <span className="text-sm font-medium uppercase tracking-wide">Bike Selector</span>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar
        value={currentStep}
        max={TOTAL_STEPS}
        label={`Step ${currentStep} of ${TOTAL_STEPS}`}
      />

      {/* Current step */}
      {stepConfig && (
        <QuizStep stepConfig={stepConfig} answers={answers} onAnswer={setAnswer} />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!isStepValid() || isSubmitting}
          loading={isSubmitting}
        >
          {currentStep === TOTAL_STEPS ? (
            <>
              See results
              <Bike className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
