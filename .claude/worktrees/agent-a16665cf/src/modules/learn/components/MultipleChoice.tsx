'use client'

import { CheckCircle, XCircle } from 'lucide-react'
import type { QuizOption } from '@/modules/learn/types'

interface MultipleChoiceProps {
  prompt: string
  options: QuizOption[]
  selectedId: string | null
  feedback: { correct: boolean; selectedId: string } | null
  onSelect: (optionId: string) => void
  disabled?: boolean
}

export function MultipleChoice({
  prompt,
  options,
  selectedId,
  feedback,
  onSelect,
  disabled,
}: MultipleChoiceProps) {
  return (
    <div>
      <p className="mb-6 text-lg font-medium text-[var(--color-text)]">{prompt}</p>
      <fieldset>
        <legend className="sr-only">Select your answer</legend>
        <div className="flex flex-col gap-3">
          {options.map((option) => {
            const isSelected = selectedId === option.id
            const showResult = feedback !== null
            const isCorrectAnswer = option.isCorrect
            const wasSelected = feedback?.selectedId === option.id

            let borderColor = 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
            if (showResult && isCorrectAnswer) {
              borderColor = 'border-green-500 bg-green-500/10'
            } else if (showResult && wasSelected && !isCorrectAnswer) {
              borderColor = 'border-red-500 bg-red-500/10'
            } else if (isSelected && !showResult) {
              borderColor = 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={disabled || showResult}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${borderColor} disabled:cursor-default`}
                aria-pressed={isSelected}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-text-muted)] text-xs font-medium text-[var(--color-text-muted)]">
                  {String.fromCharCode(65 + options.indexOf(option))}
                </span>
                <span className="flex-1 text-sm text-[var(--color-text)]">{option.text}</span>
                {showResult && isCorrectAnswer && (
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-400" aria-label="Correct answer" />
                )}
                {showResult && wasSelected && !isCorrectAnswer && (
                  <XCircle className="h-5 w-5 shrink-0 text-red-400" aria-label="Incorrect" />
                )}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
