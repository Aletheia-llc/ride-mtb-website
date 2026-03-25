'use client'

import { useTransition } from 'react'
import { CheckCheck } from 'lucide-react'
import { markAllNotificationsRead } from './actions'

interface MarkAllReadButtonProps {
  userId: string
}

export function MarkAllReadButton({ userId }: MarkAllReadButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsRead(userId))}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
    >
      <CheckCheck className="h-3.5 w-3.5" />
      Mark all read
    </button>
  )
}
