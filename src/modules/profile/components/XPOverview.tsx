import { Card } from '@/ui/components'
import type { UserProfileData } from '../types'
import { Flame, Trophy } from 'lucide-react'

interface XPOverviewProps {
  xpAggregate: UserProfileData['xpAggregate']
}

const MODULE_COLORS: Record<string, string> = {
  forum: '#6366f1',
  learn: '#22c55e',
  trails: '#f59e0b',
  bikes: '#ef4444',
  events: '#8b5cf6',
  reviews: '#ec4899',
  rides: '#14b8a6',
  marketplace: '#f97316',
  merch: '#06b6d4',
  shops: '#84cc16',
  media: '#a855f7',
  coaching: '#0ea5e9',
}

const MODULE_LABELS: Record<string, string> = {
  forum: 'Forum',
  learn: 'Learn',
  trails: 'Trails',
  bikes: 'Bikes',
  events: 'Events',
  reviews: 'Reviews',
  rides: 'Rides',
  marketplace: 'Marketplace',
  merch: 'Merch',
  shops: 'Shops',
  media: 'Media',
  coaching: 'Coaching',
}

export function XPOverview({ xpAggregate }: XPOverviewProps) {
  const totalXp = xpAggregate?.totalXp ?? 0
  const streakDays = xpAggregate?.streakDays ?? 0
  const breakdown = xpAggregate?.moduleBreakdown ?? {}

  // Sort modules by XP descending, filter out zero values
  const modules = Object.entries(breakdown)
    .filter(([, xp]) => xp > 0)
    .sort(([, a], [, b]) => b - a)

  const maxModuleXp = modules.length > 0 ? modules[0][1] : 0

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Total XP</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-[var(--color-text)]">
              {totalXp.toLocaleString()}
            </p>
            <Trophy className="h-5 w-5 text-yellow-500" />
          </div>
        </div>

        {streakDays > 0 && (
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-lg font-bold text-[var(--color-text)]">{streakDays}</p>
              <p className="text-xs text-[var(--color-text-muted)]">day streak</p>
            </div>
          </div>
        )}
      </div>

      {modules.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
            XP by Module
          </p>
          <div className="space-y-2.5">
            {modules.map(([mod, xp]) => {
              const percentage = maxModuleXp > 0 ? (xp / maxModuleXp) * 100 : 0
              const color = MODULE_COLORS[mod] ?? '#6b7280'
              const label = MODULE_LABELS[mod] ?? mod

              return (
                <div key={mod}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--color-text)]">{label}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {xp.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modules.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          No XP earned yet. Start exploring to earn your first points!
        </p>
      )}
    </Card>
  )
}
