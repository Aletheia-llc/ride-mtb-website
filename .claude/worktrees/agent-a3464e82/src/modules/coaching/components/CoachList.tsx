import { EmptyState } from '@/ui/components'
import { CoachCard } from './CoachCard'
import type { CoachSummary } from '../types'

interface CoachListProps {
  coaches: CoachSummary[]
}

export function CoachList({ coaches }: CoachListProps) {
  if (coaches.length === 0) {
    return (
      <EmptyState
        title="No coaches found"
        description="Try adjusting your filters or check back later."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {coaches.map((coach) => (
        <CoachCard key={coach.id} coach={coach} />
      ))}
    </div>
  )
}
