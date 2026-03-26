'use client'

import { useTransition } from 'react'
import { runScoring } from '@/modules/fantasy/actions/admin/manageResults'

export function RunScoringButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Run scoring for this event? This will calculate fantasy points and grant XP to all participants.')) return
    startTransition(async () => {
      const result = await runScoring(eventId)
      if (result.error) alert(`Scoring failed: ${result.error}`)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
    >
      {pending ? 'Running…' : 'Run Scoring'}
    </button>
  )
}
