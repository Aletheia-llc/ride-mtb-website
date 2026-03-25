import Link from 'next/link'
import { ChevronRight, Bike } from 'lucide-react'
import { Badge } from '@/ui/components'

interface HistoryItem {
  id: string
  primaryCategory: number
  rawScore: number
  categoryName: string
  createdAt: string // ISO string
}

interface ResultsHistoryProps {
  results: HistoryItem[]
}

export function ResultsHistory({ results }: ResultsHistoryProps) {
  if (results.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
        <Bike className="h-12 w-12 text-[var(--color-text-muted)]" />
        <h2 className="text-xl font-semibold text-[var(--color-text)]">No results yet</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Take the quiz to find your perfect bike category.
        </p>
        <Link
          href="/bikes/selector"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Start quiz
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Quiz History</h1>
        <Link
          href="/bikes/selector"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Take quiz again
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {results.map((item) => {
          const date = new Date(item.createdAt)
          const formatted = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          return (
            <Link
              key={item.id}
              href={`/bikes/selector/results/${item.id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 transition-colors hover:border-[var(--color-primary)]"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[var(--color-text)]">{item.categoryName}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{formatted}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge>Category {item.primaryCategory}</Badge>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
