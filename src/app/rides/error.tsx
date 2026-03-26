'use client'

import { AlertTriangle } from 'lucide-react'
import { Button, Card } from '@/ui/components'

export default function RidesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-24">
      <Card className="text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          {error.message || 'Failed to load ride logs. Please try again.'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </div>
  )
}
