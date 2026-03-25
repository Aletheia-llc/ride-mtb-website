'use client'

import { CheckCircle, XCircle } from 'lucide-react'
import type { QuizOption } from '@/modules/learn/types'

interface TrueFalseProps {
  prompt: string
  options: QuizOption[]
  selectedId: string | null
  feedback: { correct: boolean; selectedId: string } | null
  onSelect: (optionId: string) => void
  disabled?: boolean
}

export function TrueFalse({
  prompt,
  options,
  selectedId,
  feedback,
  onSelect,
  disabled,
}: TrueFalseProps) {
  return (
    <div>
      <p className="mb-8 text-lg font-medium text-[var(--color-text)]">{prompt}</p>
      <fieldset>
        <legend className="sr-only">True or False</legend>
        <div className="grid grid-cols-2 gap-4">
          {options.map((option) => {
            const isSelected = selectedId === option.id
            const showResult = feedback !== null
            const isCorrectAnswer = option.isCorrect
            const wasSelected = feedback?.selectedId === option.id

            let style = 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
            if (showResult && isCorrectAnswer) {
              style = 'border-green-500 bg-green-500/10'
            } else if (showResult && wasSelected && !isCorrectAnswer) {
              style = 'border-red-500 bg-red-500/10'
            } else if (isSelected && !showResult) {
              style = 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={disabled || showResult}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 text-center transition-colors ${style} disabled:cursor-default`}
                aria-pressed={isSelected}
              >
                <span className="text-2xl font-bold text-[var(--color-text)]">{option.text}</span>
                {showResult && isCorrectAnswer && (
                  <CheckCircle className="h-6 w-6 text-green-400" aria-label="Correct" />
                )}
                {showResult && wasSelected && !isCorrectAnswer && (
                  <XCircle className="h-6 w-6 text-red-400" aria-label="Incorrect" />
                )}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
