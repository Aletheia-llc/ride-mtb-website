import {
  Award,
  FilePlus,
  ThumbsUp,
  TrendingUp,
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  Calendar,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/ui/components'
import type { UserProfileData } from '../types'

const BADGE_ICONS: Record<string, LucideIcon> = {
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  Award,
  FilePlus,
  ThumbsUp,
  TrendingUp,
  Calendar,
}

interface BadgesSectionProps {
  userBadges: UserProfileData['userBadges']
}

export function BadgesSection({ userBadges }: BadgesSectionProps) {
  if (!userBadges || userBadges.length === 0) return null

  return (
    <Card>
      <p className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">Badges</p>
      <div className="flex flex-wrap gap-3">
        {userBadges.map(({ badge }) => {
          const Icon = BADGE_ICONS[badge.icon] ?? Award
          return (
            <div
              key={badge.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2"
              title={badge.description}
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: badge.color }} />
              <span className="text-sm font-medium text-[var(--color-text)]">{badge.name}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
