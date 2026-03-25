import { Card } from '@/ui/components'
import type { UserProfileData } from '../types'
import { MessageSquare, Mountain, Route, Star } from 'lucide-react'

interface ProfileStatsProps {
  counts: UserProfileData['_count']
}

export function ProfileStats({ counts }: ProfileStatsProps) {
  const stats = [
    {
      label: 'Forum Posts',
      value: counts.forumPosts,
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      label: 'Trail Reviews',
      value: counts.trailReviews,
      icon: <Mountain className="h-5 w-5" />,
    },
    {
      label: 'Rides Logged',
      value: counts.rideLogs,
      icon: <Route className="h-5 w-5" />,
    },
    {
      label: 'Gear Reviews',
      value: counts.gearReviews,
      icon: <Star className="h-5 w-5" />,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-primary)]">
            {stat.icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-text)]">
              {stat.value}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {stat.label}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}
