'use client'

import Image from 'next/image'
import { CheckCircle, XCircle } from 'lucide-react'
import type { QuizOption } from '@/modules/learn/types'

interface ImageBasedProps {
  prompt: string
  promptImageUrl?: string | null
  options: QuizOption[]
  selectedId: string | null
  feedback: { correct: boolean; selectedId: string } | null
  onSelect: (optionId: string) => void
  disabled?: boolean
}

export function ImageBased({
  prompt,
  promptImageUrl,
  options,
  selectedId,
  feedback,
  onSelect,
  disabled,
}: ImageBasedProps) {
  const hasImageOptions = options.some((o) => o.imageUrl)

  return (
    <div>
      <p className="mb-4 text-lg font-medium text-[var(--color-text)]">{prompt}</p>

      {promptImageUrl && (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg bg-[var(--color-bg-secondary)]">
          <Image
            src={promptImageUrl}
            alt="Question image"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Select your answer</legend>
        <div className={hasImageOptions ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
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
                className={`relative overflow-hidden rounded-lg border-2 transition-colors ${style} disabled:cursor-default ${
                  hasImageOptions ? 'p-2' : 'flex items-center gap-3 p-4 text-left'
                }`}
                aria-pressed={isSelected}
              >
                {option.imageUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative aspect-square w-full overflow-hidden rounded bg-[var(--color-bg-secondary)]">
                      <Image
                        src={option.imageUrl}
                        alt={option.text}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 200px"
                      />
                    </div>
                    <span className="text-sm text-[var(--color-text)]">{option.text}</span>
                    {showResult && isCorrectAnswer && (
                      <CheckCircle className="h-5 w-5 text-green-400" aria-label="Correct" />
                    )}
                    {showResult && wasSelected && !isCorrectAnswer && (
                      <XCircle className="h-5 w-5 text-red-400" aria-label="Incorrect" />
                    )}
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-[var(--color-text)]">{option.text}</span>
                    {showResult && isCorrectAnswer && (
                      <CheckCircle className="h-5 w-5 shrink-0 text-green-400" aria-label="Correct" />
                    )}
                    {showResult && wasSelected && !isCorrectAnswer && (
                      <XCircle className="h-5 w-5 shrink-0 text-red-400" aria-label="Incorrect" />
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
