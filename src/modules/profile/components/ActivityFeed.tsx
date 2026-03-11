import { Card, EmptyState } from '@/ui/components'
import type { ActivityItem } from '../types'
import { formatRelativeTime } from '../types'
import {
  MessageSquare,
  BookOpen,
  Mountain,
  Bike,
  CalendarDays,
  Star,
  Route,
  Zap,
} from 'lucide-react'

interface ActivityFeedProps {
  activities: ActivityItem[]
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  forum: <MessageSquare className="h-4 w-4" />,
  learn: <BookOpen className="h-4 w-4" />,
  trails: <Mountain className="h-4 w-4" />,
  bikes: <Bike className="h-4 w-4" />,
  events: <CalendarDays className="h-4 w-4" />,
  reviews: <Star className="h-4 w-4" />,
  rides: <Route className="h-4 w-4" />,
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No recent activity"
          description="Activity will appear here as you earn XP across the platform."
          icon={<Zap className="h-10 w-10" />}
        />
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
        Recent Activity
      </h2>
      <div className="divide-y divide-[var(--color-border)]">
        {activities.map((activity) => {
          const icon = MODULE_ICONS[activity.module] ?? <Zap className="h-4 w-4" />

          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--color-text)]">
                  {activity.description}
                </p>
                <time
                  dateTime={new Date(activity.createdAt).toISOString()}
                  className="text-xs text-[var(--color-text-muted)]"
                >
                  {formatRelativeTime(activity.createdAt)}
                </time>
              </div>
              <span className="flex-shrink-0 text-sm font-medium text-[var(--color-primary)]">
                +{activity.points} XP
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
