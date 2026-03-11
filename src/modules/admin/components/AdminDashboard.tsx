import { Card } from '@/ui/components'
import type { AdminStats } from '../types'
import {
  Users,
  MessageSquare,
  Mountain,
  CalendarDays,
  Star,
  ShoppingBag,
} from 'lucide-react'

interface AdminDashboardProps {
  stats: AdminStats
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const items = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: <Users className="h-5 w-5" />,
      href: '/admin/users',
    },
    {
      label: 'Forum Posts',
      value: stats.totalPosts,
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      label: 'Trails',
      value: stats.totalTrails,
      icon: <Mountain className="h-5 w-5" />,
    },
    {
      label: 'Events',
      value: stats.totalEvents,
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: 'Gear Reviews',
      value: stats.totalReviews,
      icon: <Star className="h-5 w-5" />,
    },
    {
      label: 'Listings',
      value: stats.totalListings,
      icon: <ShoppingBag className="h-5 w-5" />,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {items.map((item) => {
        const content = (
          <Card key={item.label} className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-primary)]">
              {item.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {item.value.toLocaleString()}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {item.label}
              </p>
            </div>
          </Card>
        )

        if (item.href) {
          return (
            <a key={item.label} href={item.href} className="transition-opacity hover:opacity-80">
              {content}
            </a>
          )
        }

        return <div key={item.label}>{content}</div>
      })}
    </div>
  )
}
