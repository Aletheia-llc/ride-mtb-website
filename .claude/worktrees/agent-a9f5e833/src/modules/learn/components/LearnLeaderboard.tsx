import { Trophy } from 'lucide-react'
import { Avatar, Card } from '@/ui/components'

interface LeaderboardEntry {
  rank: number
  user: {
    id: string
    name: string | null
    image: string | null
    username: string | null
  }
  totalXp: number
}

interface LearnLeaderboardProps {
  entries: LeaderboardEntry[]
}

export function LearnLeaderboard({ entries }: LearnLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center text-[var(--color-text-muted)]">
          No leaderboard data yet. Complete courses to earn XP!
        </div>
      </Card>
    )
  }

  const rankColors: Record<number, string> = {
    1: 'text-yellow-600',
    2: 'text-gray-500',
    3: 'text-orange-600',
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-600" />
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Leaderboard</h3>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {entries.map((entry) => (
          <div key={entry.user.id} className="flex items-center gap-3 py-3">
            <span className={`w-8 text-center text-sm font-bold ${rankColors[entry.rank] || 'text-[var(--color-text-muted)]'}`}>
              {entry.rank}
            </span>
            <Avatar
              src={entry.user.image}
              alt={entry.user.name || 'User'}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">
                {entry.user.name || entry.user.username || 'Anonymous'}
              </p>
            </div>
            <span className="text-sm font-semibold text-[var(--color-primary)]">
              {entry.totalXp.toLocaleString()} XP
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
