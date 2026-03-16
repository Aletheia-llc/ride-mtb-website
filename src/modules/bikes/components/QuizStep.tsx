'use client'

import Image from 'next/image'
import { Check } from 'lucide-react'
import type { QuizStepConfig, QuizAnswers } from '../types'

interface QuizStepProps {
  stepConfig: QuizStepConfig
  answers: QuizAnswers
  onAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
}

export function QuizStep({ stepConfig, answers, onAnswer }: QuizStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">{stepConfig.title}</h2>
        {stepConfig.subtitle && (
          <p className="mt-1 text-[var(--color-text-muted)]">{stepConfig.subtitle}</p>
        )}
      </div>

      {stepConfig.type === 'single_select' && stepConfig.options && (
        <SingleSelect
          options={stepConfig.options}
          value={answers[stepConfig.key as keyof QuizAnswers] as string}
          onChange={(val) => onAnswer(stepConfig.key as keyof QuizAnswers, val as never)}
        />
      )}

      {stepConfig.type === 'multi_select' && stepConfig.options && (
        <MultiSelect
          options={stepConfig.options}
          value={answers[stepConfig.key as keyof QuizAnswers] as string[]}
          onChange={(val) => onAnswer(stepConfig.key as keyof QuizAnswers, val as never)}
          maxSelections={stepConfig.key === 'priorities' ? 2 : undefined}
        />
      )}

      {stepConfig.type === 'slider' && (
        <SliderStep
          stepConfig={stepConfig}
          answers={answers}
          onAnswer={onAnswer}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Single select option grid                                                  */
/* -------------------------------------------------------------------------- */

function OptionCard({
  option,
  selected,
  multi,
  onClick,
}: {
  option: NonNullable<QuizStepConfig['options']>[number]
  selected: boolean
  multi: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative overflow-hidden rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-[var(--color-primary)] shadow-md'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary-light)]'
      }`}
    >
      {option.image ? (
        <>
          {/* Image + overlay */}
          <div className="relative min-h-[120px] overflow-hidden">
            <Image
              src={option.image}
              alt={option.label}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.0) 100%)',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="flex items-end justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold leading-tight text-white">{option.label}</span>
                  {option.description && (
                    <span className="text-xs leading-tight text-white/75">{option.description}</span>
                  )}
                </div>
                {selected && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                    {multi ? <Check className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`flex flex-col gap-1 p-4 ${selected ? 'bg-[var(--color-primary)]/5' : 'bg-[var(--color-bg)]'}`}>
          <div className="flex w-full items-center justify-between">
            <span className="font-medium text-[var(--color-text)]">{option.label}</span>
            {selected && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
          {option.description && (
            <span className="text-sm text-[var(--color-text-muted)]">{option.description}</span>
          )}
        </div>
      )}
    </button>
  )
}

function SingleSelect({
  options,
  value,
  onChange,
}: {
  options: NonNullable<QuizStepConfig['options']>
  value: string
  onChange: (value: string) => void
}) {
  const cols = options.length >= 5 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <div className={`grid gap-3 ${cols}`}>
      {options.map((option) => (
        <OptionCard
          key={option.id}
          option={option}
          selected={value === option.id}
          multi={false}
          onClick={() => onChange(option.id)}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Multi select option grid                                                   */
/* -------------------------------------------------------------------------- */

function MultiSelect({
  options,
  value,
  onChange,
  maxSelections,
}: {
  options: NonNullable<QuizStepConfig['options']>
  value: string[]
  onChange: (value: string[]) => void
  maxSelections?: number
}) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      if (maxSelections && value.length >= maxSelections) {
        // Replace the oldest selection
        onChange([...value.slice(1), id])
      } else {
        onChange([...value, id])
      }
    }
  }

  const cols = options.length >= 5 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <div className={`grid gap-3 ${cols}`}>
      {options.map((option) => (
        <OptionCard
          key={option.id}
          option={option}
          selected={value.includes(option.id)}
          multi={true}
          onClick={() => toggle(option.id)}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Slider + toggle fields                                                     */
/* -------------------------------------------------------------------------- */

function SliderStep({
  stepConfig,
  answers,
  onAnswer,
}: {
  stepConfig: QuizStepConfig
  answers: QuizAnswers
  onAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
}) {
  // Determine which answer key holds the values for this step
  const answerKey = stepConfig.key as keyof QuizAnswers
  const currentValues = answers[answerKey] as Record<string, number | boolean>

  function handleSliderChange(fieldKey: string, rawValue: number) {
    const updated = { ...currentValues, [fieldKey]: rawValue }
    onAnswer(answerKey, updated as never)
  }

  function handleToggleChange(fieldKey: string, checked: boolean) {
    const updated = { ...currentValues, [fieldKey]: checked }
    onAnswer(answerKey, updated as never)
  }

  function formatValue(value: number, unit: string): string {
    if (unit === '$') return `$${value.toLocaleString()}`
    if (unit) return `${value} ${unit}`
    return String(value)
  }

  return (
    <div className="flex flex-col gap-8">
      {stepConfig.sliderFields?.map((field) => {
        const value = (currentValues[field.key] as number) ?? field.min
        return (
          <div key={field.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[var(--color-text)]">{field.label}</label>
              <span className="text-lg font-semibold text-[var(--color-primary)]">
                {formatValue(value, field.unit)}
              </span>
            </div>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value}
              onChange={(e) => handleSliderChange(field.key, Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-primary)]"
            />
            {(field.minLabel || field.maxLabel) && (
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>{field.minLabel ?? ''}</span>
                <span>{field.maxLabel ?? ''}</span>
              </div>
            )}
          </div>
        )
      })}

      {stepConfig.toggleFields?.map((field) => {
        const checked = (currentValues[field.key] as boolean) ?? false
        return (
          <label
            key={field.key}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-border)] p-4"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-[var(--color-text)]">{field.label}</span>
              {field.description && (
                <span className="text-sm text-[var(--color-text-muted)]">{field.description}</span>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              onClick={() => handleToggleChange(field.key, !checked)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  checked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        )
      })}
    </div>
  )
}
