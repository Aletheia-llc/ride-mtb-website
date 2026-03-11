'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { CheckCircle, XCircle } from 'lucide-react'
import type { DiagramMatchConfig } from '@/modules/learn/types'

interface DiagramMatchProps {
  prompt: string
  config: DiagramMatchConfig
  feedback: { correct: boolean } | null
  onAnswer: (matches: Record<string, string>) => void
  disabled?: boolean
}

export function DiagramMatch({
  prompt,
  config,
  feedback,
  onAnswer,
  disabled,
}: DiagramMatchProps) {
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const showResult = feedback !== null

  const handleLabelClick = useCallback(
    (labelId: string) => {
      if (disabled || showResult) return
      setSelectedLabel(labelId)
    },
    [disabled, showResult]
  )

  const handleTargetClick = useCallback(
    (targetId: string) => {
      if (disabled || showResult || !selectedLabel) return

      const newMatches = { ...matches, [targetId]: selectedLabel }
      setMatches(newMatches)
      setSelectedLabel(null)

      if (Object.keys(newMatches).length === config.targets.length) {
        onAnswer(newMatches)
      }
    },
    [disabled, showResult, selectedLabel, matches, config.targets.length, onAnswer]
  )

  const usedLabels = new Set(Object.values(matches))

  return (
    <div>
      <p className="mb-2 text-lg font-medium text-[var(--color-text)]">{prompt}</p>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Click a label, then click its matching target on the diagram.
      </p>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-wrap gap-2 lg:w-48 lg:flex-col">
          {config.labels.map((label) => {
            const isUsed = usedLabels.has(label.id)
            const isActive = selectedLabel === label.id

            return (
              <button
                key={label.id}
                onClick={() => handleLabelClick(label.id)}
                disabled={disabled || showResult || isUsed}
                className={`rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : isUsed
                      ? 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                } disabled:cursor-default`}
              >
                {label.text}
              </button>
            )
          })}
        </div>

        <div className="relative flex-1">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--color-bg-secondary)]">
            <Image
              src={config.imageUrl}
              alt="Diagram"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 500px"
            />

            {config.targets.map((target) => {
              const matchedLabel = matches[target.id]
              const isCorrect = showResult && matchedLabel === target.labelId
              const isWrong = showResult && matchedLabel && matchedLabel !== target.labelId

              return (
                <button
                  key={target.id}
                  onClick={() => handleTargetClick(target.id)}
                  disabled={disabled || showResult || !selectedLabel}
                  className={`absolute flex items-center justify-center rounded-full border-2 transition-colors ${
                    matchedLabel
                      ? isCorrect
                        ? 'border-green-500 bg-green-500/15'
                        : isWrong
                          ? 'border-red-500 bg-red-500/15'
                          : 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                      : selectedLabel
                        ? 'border-[var(--color-text-muted)] bg-[var(--color-bg)]/80 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-border)] bg-[var(--color-bg)]/80'
                  }`}
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                    width: '2rem',
                    height: '2rem',
                    transform: 'translate(-50%, -50%)',
                  }}
                  aria-label={matchedLabel ? `Matched: ${config.labels.find((l) => l.id === matchedLabel)?.text}` : 'Empty target'}
                >
                  {showResult && isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {showResult && isWrong && <XCircle className="h-4 w-4 text-red-600" />}
                  {!showResult && matchedLabel && (
                    <span className="text-xs font-bold text-[var(--color-primary)]">
                      {config.labels.findIndex((l) => l.id === matchedLabel) + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
