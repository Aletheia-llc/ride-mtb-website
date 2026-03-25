'use client'

import Link from 'next/link'
import { Trophy, Target, Zap, RotateCcw, ArrowRight } from 'lucide-react'
import { Button, Card, ProgressBar, Badge } from '@/ui/components'
import type { QuizResultData } from '@/modules/learn/types'

const tierVariants = {
  gold: 'gold',
  silver: 'silver',
  bronze: 'bronze',
  incomplete: 'error',
} as const

const tierColors = {
  gold: 'text-yellow-600',
  silver: 'text-gray-500',
  bronze: 'text-orange-600',
  incomplete: 'text-red-600',
} as const

interface QuizResultsProps {
  result: QuizResultData
  quizTitle: string
  onRetake: () => void
  nextModuleUrl?: string | null
  courseUrl?: string | null
}

export function QuizResults({
  result,
  quizTitle,
  onRetake,
  nextModuleUrl,
  courseUrl,
}: QuizResultsProps) {
  const scoreColor = result.score >= 90 ? 'green' : result.score >= 75 ? 'blue' : result.score >= 60 ? 'yellow' : 'red'

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center">
        <div className={`mb-3 text-5xl font-bold ${tierColors[result.tier]}`}>
          {result.score}%
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--color-text)]">{quizTitle}</h2>
        <Badge variant={tierVariants[result.tier]} className="capitalize">
          {result.tier}
        </Badge>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <Card className="text-center">
          <Target className="mx-auto mb-2 h-6 w-6 text-[var(--color-primary)]" />
          <div className="text-2xl font-bold text-[var(--color-text)]">{result.correctCount}</div>
          <div className="text-xs text-[var(--color-text-muted)]">of {result.totalCount} correct</div>
        </Card>
        <Card className="text-center">
          <Trophy className="mx-auto mb-2 h-6 w-6 text-yellow-600" />
          <div className="text-2xl font-bold text-[var(--color-text)] capitalize">{result.tier}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Tier earned</div>
        </Card>
        <Card className="text-center">
          <Zap className="mx-auto mb-2 h-6 w-6 text-[var(--color-primary)]" />
          <div className="text-2xl font-bold text-[var(--color-text)]">+{result.xpEarned}</div>
          <div className="text-xs text-[var(--color-text-muted)]">XP earned</div>
        </Card>
      </div>

      <Card className="mb-8">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">Score Breakdown</h3>
        <ProgressBar
          value={result.score}
          label={`${scoreColor} tier`}
        />
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold text-red-600">Incomplete</div>
            <div className="text-[var(--color-text-muted)]">&lt;60%</div>
          </div>
          <div>
            <div className="font-semibold text-orange-600">Bronze</div>
            <div className="text-[var(--color-text-muted)]">60%+</div>
          </div>
          <div>
            <div className="font-semibold text-gray-500">Silver</div>
            <div className="text-[var(--color-text-muted)]">75%+</div>
          </div>
          <div>
            <div className="font-semibold text-yellow-600">Gold</div>
            <div className="text-[var(--color-text-muted)]">90%+</div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <Button onClick={onRetake} variant="secondary" className="w-full">
          <RotateCcw className="h-4 w-4" />
          Retake Quiz
        </Button>
        {nextModuleUrl && (
          <Link href={nextModuleUrl}>
            <Button className="w-full">
              Next Module
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
        {courseUrl && (
          <Link href={courseUrl}>
            <Button variant="secondary" className="w-full">
              Back to Course
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
